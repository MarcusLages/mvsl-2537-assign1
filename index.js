let allPokemons = [];
let randomPokemonImgs = [];
let DIFFICULTY = 6;
let clicks = 0;
let matchCards = 0;
let firstCard = undefined;
let secondCard = undefined;
let time = 0;
let hint = true;
let timer;

// TODO
// FIX STUFF WITH THE TIMER

// Get all the pokemons from the api for the first run
async function fetchPokemons() {
  let response = await axios.get(
    "https://pokeapi.co/api/v2/pokemon?offset=0&limit=10000"
  );
  allPokemons = response.data.results;
  randomPokemonImgs = await getRandomPokemons();
  // console.log(allPokemons);
  // console.log(randomPokemonImgs);
}

// Get all random pokemons and their data
async function getRandomPokemons() {
  let random = [];
  for (let i = 1; i <= (DIFFICULTY / 2); i++) {
    let randomNumber = Math.floor(Math.random() * (allPokemons.length - 1)) + 1;

    // After 1024, the pokemons jump to 10001 and then procede from there 
    if (randomNumber > 1025) {
      randomNumber += 8975;
    }

    let response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${randomNumber}`);
    let sprite = response.data.sprites.other["official-artwork"].front_default;

    if (isInArray(sprite, random)) i--;
    else random.push(sprite);
  }

  return random;
}

function isInArray(spriteUrl, random) {
  for (let i = 0; i < random.length; i++) {
    if (random[i] == spriteUrl) {
      // console.log(random[i], spriteUrl)
      return true;
    }
  }
  return false;
}

function displayPokemons() {
  let freq = [];
  $('#game_grid').empty();

  for (let i = 0; i < randomPokemonImgs.length; i++) {
    freq.push(2);
  }

  for (let i = 0; i < randomPokemonImgs.length * 2; i++) {
    let randPokeNum;
    do {
      randPokeNum = Math.floor(Math.random() * randomPokemonImgs.length);
      if (freq[randPokeNum] > 0) {
        freq[randPokeNum]--;
        break;
      }
    } while (true);

    $("#game_grid").append(`
      <div class="card">
        <img id="img${i}" class="front_face" src="${randomPokemonImgs[randPokeNum]}" alt="">
        <img class="back_face" src="back.webp" alt="">
      </div>`);
  }
}

const displayTime = () => {
  time++;
  $('#timer').empty();
  $('#timer').append(`
    <h5>
      ${time} seconds
    </h5>
  `);
}

function updateClicks(click) {
  clicks += click;
  $('#info').empty();
  $('#info').append(`
    <h5>Clicks: ${clicks}</h5>
  `);
}

function setupCards() {
  $(".card").on("click", function () {
    if (!firstCard) {
      $(this).toggleClass("flip");
      updateClicks(1);
      firstCard = $(this).find(".front_face")[0];
    }
    else {
      secondCard = $(this).find(".front_face")[0];
      console.log(firstCard.id != secondCard.id);
      if (firstCard.id !== secondCard.id) {
        $(this).toggleClass("flip");
        updateClicks(1);

        if (firstCard.src == secondCard.src) {
          console.log("match");
          $(`#${firstCard.id}`).parent().off("click");
          $(`#${secondCard.id}`).parent().off("click");
          firstCard = undefined;
          secondCard = undefined;

          matchCards++;
          console.log(matchCards)
          countPairs();

          if (matchCards == DIFFICULTY / 2) {
            $('#win').append('YOU WON!');
            time = 0;
            clearInterval(timer);
          }
        } else {
          console.log("no match");
          setTimeout(() => {
            $(`#${firstCard.id}`).parent().toggleClass("flip");
            $(`#${secondCard.id}`).parent().toggleClass("flip");
            firstCard = undefined;
            secondCard = undefined;
          }, 1000);
        }
      }
    }
  });
}

function countPairs() {
  const totalPairs = DIFFICULTY / 2;
  const leftPairs = totalPairs - matchCards;
  $('#pairs').empty();
  $('#pairs').append(`
    <h6>Total pairs: ${totalPairs}</h6>
    <h6>Pairs matched: ${matchCards}</h6>
    <h6>Pairs left: ${leftPairs}</h6>
  `);
}

// TODO
// TAKE OUT DIFFICULTY BUTTON EVENT CLICKERS
function startGame() {
  setupCards();

  $('#hint').on('click', () => {
    if (hint) {
      setTimeout(() => {
        $(`.card`).toggleClass("flip");
        setTimeout(() => {
          $(`.card`).toggleClass("flip");
          hint = false;
          $('#hint').attr('disabled', 'true');
        }, 1000);
      }, 1000);
    }
  });

  timer = setInterval(displayTime, 1000);
}

async function reset() {
  firstCard = undefined;
  secondCard = undefined;
  matchCards = 0;
  time = 0;
  hint = true;

  $('#hint').off('click');
  $('#hint').removeAttr('disabled');
  $('.card').off('click');
  clearInterval(timer);
  $('#timer').empty();
  $('#win').empty();

  await fetchPokemons();
  displayPokemons();
  updateClicks(-clicks);
  countPairs();
}

// FIX
// Fix the game logic
// Fetch pokemons
// Display them
const setup = async () => {
  await fetchPokemons();
  displayPokemons();
  updateClicks(0);
  countPairs();

  $('#easy-btn').on('click', async () => {
    DIFFICULTY = 6;
    console.log(DIFFICULTY)
    reset();
  })

  $('#med-btn').on('click', async () => {
    DIFFICULTY = 8;
    console.log(DIFFICULTY);
    reset();
  })

  $('#hard-btn').on('click', async () => {
    DIFFICULTY = 12;
    console.log(DIFFICULTY);
    reset();
  })

  $('#reset').on('click', reset)

  $('#light').on('click', ()=> {
    $('#panel').removeClass('lightmode');
    $('#panel').removeClass('darkmode');
    $('#panel').addClass('lightmode');
    $('.card').attr('style', 'background-color: white; border: 3px solid gray;');
  })

  $('#dark').on('click', ()=> {
    $('#panel').removeClass('lightmode');
    $('#panel').removeClass('darkmode');
    $('#panel').addClass('darkmode');
    $('.card').attr('style', 'background-color: gray; border: 3px solid white;');
  })

  $('#start').on('click', startGame);
};

$(document).ready(setup);
