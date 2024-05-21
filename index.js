const PAGE_SIZE = 10;
const DISPLAY_PAGES = 2;
let numPages = 1;
let currentPage = 1;
let filters = [];
let filteredPokemons = [];
let allPokemons = [];

const updatePagDiv = function () {
  // Empties pagination
  $("#pagination").empty();

  // Defines pagination to start from (current - displayConst) to (current + displayConst)
  // while having a min value of 1 and max value of numPages
  const startPage =
    currentPage - DISPLAY_PAGES > 0 ? currentPage - DISPLAY_PAGES : 1;
  const endPage =
    currentPage + DISPLAY_PAGES < numPages
      ? currentPage + DISPLAY_PAGES
      : numPages;

  if (startPage > 1) {
    $("#pagination").append(`
    <button class="btn btn-outline-danger page ml-1 numberedButtons" value="${1}"><<</button>
    `);
  }

  for (let i = startPage; i <= endPage; i++) {
    let button = '<button class="btn btn-';

    if (i == currentPage) button += "primary";
    else if (i == 1 || i == numPages) button += "outline-danger";
    else button += "outline-primary";

    button += ` page ml-1 numberedButtons" value="${i}">${i}</button>`;
    $("#pagination").append(button);
  }

  if (endPage < numPages) {
    $("#pagination").append(`
    <button class="btn btn-outline-danger page ml-1 numberedButtons" value="${numPages}">>></button>
    `);
  }
};

const paginate = async function () {
  // Defines which pokemons of the pokemon array are displayed in the page
  // e.g. if on page 1 and page_size = 10: goes from pokemon 0 to pokemon 10-1
  selectedPokemons = filteredPokemons.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  $("#pokeCards").empty();
  selectedPokemons.forEach(async (pokemon) => {
    const res = await axios.get(pokemon.url);
    $("#pokeCards").append(`
      <div class="pokeCard card" pokeName=${res.data.name}>
        <h4>${res.data.name.toUpperCase()}</h4> 
        <img src="${res.data.sprites.front_default}" alt="${res.data.name}"/>
        <button type="button" class="btn btn-primary" data-toggle="modal" data-target="#pokeModal">
          More
        </button>
        </div>  
        `);
  });
};

const displayTypes = async function () {
  let res = await axios.get("https://pokeapi.co/api/v2/type");
  console.log(res);
  res = res.data.results;
  res.forEach(function (type) {
    $("#typeSelect").append(`
        <div class="form-check form-check-inline">
          <input class="form-check-input" type="checkbox" value="${type.name}" pokeURL="${type.url}">
          <label class="form-check-label" for="flexCheckDefault">${type.name}</label>
        </div>
        `);
  });
};

// Sets up the first 10 pokemons
const setup = async function () {
  $("#pokeCards").empty();
  let response = await axios.get(
    "https://pokeapi.co/api/v2/pokemon?offset=0&limit=10000"
  );

  allPokemons = response.data.results;
  filteredPokemons = allPokemons;

  paginate();

  numPages = Math.ceil(allPokemons.length / PAGE_SIZE);
  updatePagDiv();
  displayTypes();

  // Sets up the pokemon information
  $("body").on("click", ".pokeCard", async function (e) {
    const pokemonName = $(this).attr("pokeName");
    // console.log("pokemonName: ", pokemonName);
    const res = await axios.get(
      `https://pokeapi.co/api/v2/pokemon/${pokemonName}`
    );
    // console.log("res.data: ", res.data);
    const types = res.data.types.map((type) => type.type.name);
    // console.log("types: ", types);
    $(".modal-body").html(`
        <div style="width:200px">
          <img src="${res.data.sprites.other["official-artwork"].front_default
      }" alt="${res.data.name}"/>
        <div>
        <h3>Abilities</h3>
        <ul>
        ${res.data.abilities
        .map((ability) => `<li>${ability.ability.name}</li>`)
        .join("")}
        </ul>
        </div>

        <div>
        <h3>Stats</h3>
        <ul>
        ${res.data.stats
        .map((stat) => `<li>${stat.stat.name}: ${stat.base_stat}</li>`)
        .join("")}
        </ul>

        </div>

        </div>
          <h3>Types</h3>
          <ul>
          ${types.map((type) => `<li>${type}</li>`).join("")}
          </ul>
      
        `);
    $(".modal-title").html(`
        <h2>${res.data.name.toUpperCase()}</h2>
        <h5>${res.data.id}</h5>
        `);
  });

  // Event listener to pagination buttons
  $("body").on("click", ".numberedButtons", async function (e) {
    currentPage = Number(e.target.value);
    paginate();

    // Update pagination buttons
    updatePagDiv();
  });

  $("body").on("change", ".form-check-input", async function (e) {
    if (e.target.checked) {
      filters = [...filters, $(this).attr("pokeURL")];
    } else {
      filters.splice(filters.indexOf($(this).attr("pokeURL")), 1);
    }

    currentPage = 1;

    await filterPokemons();
    numPages = Math.ceil(filteredPokemons.length / PAGE_SIZE);
    paginate();
    updatePagDiv();

    // filterPokemons();
    // paginate();
    // display();
    console.log(filters);
  });
};

function filterPokemons() {
  return new Promise(async (resolve, reject) => {
    if (filters.length === 0) {
      filteredPokemons = allPokemons;
      resolve();
    } else {
      filteredPokemons = [];

      await populateFilteredList();

      resolve();
    }
  });
}

function populateFilteredList() {
  return new Promise(async (resolve, reject) => {
    for (let i = 0; i < filters.length; i++) {
      let typeURL = filters[i];
      const typeData = await axios.get(typeURL);
      const pokeURL = typeData.data.pokemon;
      let innerFilter = [];

      pokeURL.forEach(async (pokeData) => {
        const pokemon = pokeData.pokemon;
        // console.log(pokemon.name)
        if (i === 0) {
          filteredPokemons = [...filteredPokemons, pokemon];
        } else {
          filteredPokemons.forEach((pk) => {
            if (pk.name == pokemon.name) {
              innerFilter = [...innerFilter, pokemon];
              return;
            }
          });
        }
      });

      if (i != 0)
        filteredPokemons = innerFilter;
    }
    resolve();
  });
}

// start the document using the setup function
$("document").ready(setup);
