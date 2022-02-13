<script setup lang="ts">
import { onUnmounted } from 'vue'
import { useCookie } from 'vue-cookie-next'
import { getQuery, getDay, getWordOfTheDay } from './words'
import { allWords } from './all_words'
import Keyboard from './Keyboard.vue'
import { LetterState } from './types'

let doSaveState = true
let gameid = $ref('')
let query = getQuery()
if (query === null) {
    query = getDay(new Date())
    gameid = 'день '+query
} else {
    gameid = 'слово '+query
    doSaveState = false
}

// Get word of the day
const answer = getWordOfTheDay(query)

// Board state. Each tile is represented as { letter, state }
let board = $ref(
  Array.from({ length: 6 }, () =>
    Array.from({ length: 5 }, () => ({
      letter: '',
      state: LetterState.INITIAL
    }))
  )
)


// Current active row.
let currentRowIndex = $ref(0)
const currentRow = $computed(() => board[currentRowIndex])

// Feedback state: message and shake
let message = $ref('')
let copy = $ref(false)
let grid = $ref('')
let shakeRowIndex = $ref(-1)
let success = $ref(false)
let immediateSuccess = false
let finished = $ref(false)
let textToCopy = $ref('')

// Keep track of revealed letters for the virtual keyboard
let letterStates: Record<string, LetterState> = $ref({})

const cookie = useCookie()
let cont = true
if (doSaveState && cookie.getCookie('query') == query) {
    cont = readState(cookie)
} else if (doSaveState) {
    cookie.setCookie('query', query)
    saveState(cookie)
}

function saveState(cookie) {
    if (doSaveState) {
        cookie.setCookie('slovr_board', JSON.stringify(board))
        cookie.setCookie('slovr_currentRowIndex', currentRowIndex)
        cookie.setCookie('slovr_letterStates', letterStates)
        cookie.setCookie('slovr_success', immediateSuccess)
        cookie.setCookie('slovr_finished', finished)
    }
}
function readState(cookie) {
    const storedState = cookie.getCookie('slovr_board')
    if (storedState != null) {
        board = JSON.parse(storedState)
    }
    const storedCurrentRowIndex = cookie.getCookie('slovr_currentRowIndex')
    if (storedCurrentRowIndex != null) {
        currentRowIndex = Number(storedCurrentRowIndex)
    }
    const storedLetterStates = cookie.getCookie('slovr_letterStates')
    if (storedLetterStates != null) {
        letterStates = storedLetterStates
    }
    const storedSuccess = cookie.getCookie('slovr_success')
    if (storedSuccess != null) {
        immediateSuccess = (storedSuccess === 'true')
    }
    const storedFinished = cookie.getCookie('slovr_finished')
    if (storedFinished != null && storedFinished === 'true') {
        showSuccessMessage(immediateSuccess)
    }
    return storedFinished == null || storedFinished === 'false'
}

// Handle keyboard input.
let allowInput = cont

const onKeyup = (e: KeyboardEvent) => onKey(e.key)

window.addEventListener('keyup', onKeyup)

onUnmounted(() => {
  window.removeEventListener('keyup', onKeyup)
})

function onKey(key: string) {
  if (!allowInput) return
  if (/^[а-яА-ЯёЁ]$/.test(key)) {
    fillTile(key.toLowerCase())
  } else if (key === 'Backspace') {
    clearTile()
  } else if (key === 'Enter' || key === 'Энтер') {
    completeRow()
  }
}

function fillTile(letter: string) {
  for (const tile of currentRow) {
    if (!tile.letter) {
      tile.letter = letter
      break
    }
  }
}

function clearTile() {
  for (const tile of [...currentRow].reverse()) {
    if (tile.letter) {
      tile.letter = ''
      break
    }
  }
}

function completeRow() {
  if (currentRow.every((tile) => tile.letter)) {
    const guess = currentRow.map((tile) => tile.letter).join('')
    if (guess !== answer && ! wordInDictionary(guess)) {
      shake()
      showMessage(`Not in word list`)
      return
    }

    const answerLetters: (string | null)[] = answer.split('')
    // first pass: mark correct ones
    currentRow.forEach((tile, i) => {
      if (answerLetters[i] === tile.letter) {
        tile.state = letterStates[tile.letter] = LetterState.CORRECT
        answerLetters[i] = null
      }
    })
    // second pass: mark the present
    currentRow.forEach((tile) => {
      if (!tile.state && answerLetters.includes(tile.letter)) {
        tile.state = LetterState.PRESENT
        answerLetters[answerLetters.indexOf(tile.letter)] = null
        if (!letterStates[tile.letter]) {
          letterStates[tile.letter] = LetterState.PRESENT
        }
      }
    })
    // 3rd pass: mark absent
    currentRow.forEach((tile) => {
      if (!tile.state) {
        tile.state = LetterState.ABSENT
        if (!letterStates[tile.letter]) {
          letterStates[tile.letter] = LetterState.ABSENT
        }
      }
    })

    allowInput = false
    if (currentRow.every((tile) => tile.state === LetterState.CORRECT)) {
      // yay!
      immediateSuccess = true
      showSuccessMessage(true)
    } else if (currentRowIndex < board.length - 1) {
      // go the next row
      currentRowIndex++
      setTimeout(() => {
        allowInput = true
      }, 1600)
    } else {
      // game over :(
      showSuccessMessage(false)
    }
    saveState(cookie)
  } else {
    shake()
    showMessage('Not enough letters')
  }
}

function wordInDictionary(word: string) {
    var pointer = allWords
    for (var i in word) {
        if (word[i] in pointer) {
            pointer = pointer[word[i]]
        } else {
            return false
        }
    }
    return true
}

function showSuccessMessage(good: boolean) {
    finished = true
    if (good) {
      setTimeout(() => {
        grid = genResultGrid()
        let msg = ['ЧИТЕР', 'Вау!', 'Впечатляюще', 'Отлично', 'Неплохо', 'Фух'][
                    currentRowIndex
                  ]
        var rownum = 1 + currentRowIndex
        let copystr = 'Словрь ' + gameid + ': ' + rownum + '/6\r\n' + grid
        showMessage(msg, copystr, -1)
        success = true
      }, 1600)
    } else {
      setTimeout(() => {
        grid = genResultGrid()
        let msg = 'Потрачено! Ответ: ' + answer.toUpperCase()
        let copystr = 'Словрь ' + gameid + ': X/6\r\n' + genResultGrid()
        showMessage(msg, copystr, -1)
      }, 1600)
    }
}

function showMessage(msg: string, copystr: string = '', time = 1000) {
  message = msg
  copy = copystr != ''
  textToCopy = copystr
  if (time > 0) {
    setTimeout(() => {
      message = ''
      copy = false
      textToCopy = ''
    }, time)
  }
}

function shake() {
  shakeRowIndex = currentRowIndex
  setTimeout(() => {
    shakeRowIndex = -1
  }, 1000)
}

const icons = {
  [LetterState.CORRECT]: '🟩',
  [LetterState.PRESENT]: '🟨',
  [LetterState.ABSENT]: '⬜',
  [LetterState.INITIAL]: null
}

function genResultGrid() {
  return board
    .slice(0, currentRowIndex + 1)
    .map((row) => {
      return row.map((tile) => icons[tile.state]).join('')
    })
    .join('\n')
}
</script>

<template>
  <Transition>
    <div class="message" v-if="message">
      {{ message }}
      <pre v-if="grid">{{ grid }}</pre>
      <div v-if="copy">
        <button class="copy" v-clipboard="textToCopy">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="#fff">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
          </svg>
        </button>
      </div>
    </div>
  </Transition>
  <header>
    <h1>СЛОВРЬ</h1>
  </header>
  <div id="board">
    <div
      v-for="(row, index) in board"
      :class="[
        'row',
        shakeRowIndex === index && 'shake',
        success && currentRowIndex === index && 'jump'
      ]"
    >
      <div
        v-for="(tile, index) in row"
        :class="['tile', tile.letter && 'filled', tile.state && 'revealed']"
      >
        <div class="front" :style="{ transitionDelay: `${index * 300}ms` }">
          {{ tile.letter }}
        </div>
        <div
          :class="['back', tile.state]"
          :style="{
            transitionDelay: `${index * 300}ms`,
            animationDelay: `${index * 100}ms`
          }"
        >
          {{ tile.letter }}
        </div>
      </div>
    </div>
  </div>
  <Keyboard @key="onKey" :letter-states="letterStates" />
</template>

<style scoped>
#board {
  display: grid;
  grid-template-rows: repeat(6, 1fr);
  grid-gap: 5px;
  padding: 10px;
  box-sizing: border-box;
  --height: min(420px, calc(var(--vh, 100vh) - 310px));
  height: var(--height);
  width: min(350px, calc(var(--height) / 6 * 5));
  margin: 0px auto;
}
.message {
  position: absolute;
  left: 50%;
  top: 80px;
  color: #fff;
  background-color: rgba(0, 0, 0, 0.85);
  padding: 16px 20px;
  z-index: 2;
  border-radius: 4px;
  transform: translateX(-50%);
  transition: opacity 0.3s ease-out;
  font-weight: 600;
}
.message.v-leave-to {
  opacity: 0;
}
.copy {
  width: 50px;
  margin: 10px 0 0;
  background-color: inherit;
  border: inherit;
  border-radius: 8px;
}
.copy:active {
  background-color: #6aaa64;
}
#copyText {
  display: none;
}
.row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-gap: 5px;
}
.tile {
  width: 100%;
  font-size: 2rem;
  line-height: 2rem;
  font-weight: bold;
  vertical-align: middle;
  text-transform: uppercase;
  user-select: none;
  position: relative;
}
.tile.filled {
  animation: zoom 0.2s;
}
.tile .front,
.tile .back {
  box-sizing: border-box;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: transform 0.6s;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.tile .front {
  border: 2px solid #d3d6da;
}
.tile.filled .front {
  border-color: #999;
}
.tile .back {
  transform: rotateX(180deg);
}
.tile.revealed .front {
  transform: rotateX(180deg);
}
.tile.revealed .back {
  transform: rotateX(0deg);
}

@keyframes zoom {
  0% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.shake {
  animation: shake 0.5s;
}

@keyframes shake {
  0% {
    transform: translate(1px);
  }
  10% {
    transform: translate(-2px);
  }
  20% {
    transform: translate(2px);
  }
  30% {
    transform: translate(-2px);
  }
  40% {
    transform: translate(2px);
  }
  50% {
    transform: translate(-2px);
  }
  60% {
    transform: translate(2px);
  }
  70% {
    transform: translate(-2px);
  }
  80% {
    transform: translate(2px);
  }
  90% {
    transform: translate(-2px);
  }
  100% {
    transform: translate(1px);
  }
}

.jump .tile .back {
  animation: jump 0.5s;
}

@keyframes jump {
  0% {
    transform: translateY(0px);
  }
  20% {
    transform: translateY(5px);
  }
  60% {
    transform: translateY(-25px);
  }
  90% {
    transform: translateY(3px);
  }
  100% {
    transform: translateY(0px);
  }
}

@media (max-height: 680px) {
  .tile {
    font-size: 3vh;
  }
}
</style>
