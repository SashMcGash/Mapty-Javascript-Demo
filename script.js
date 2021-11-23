'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12.01], 27, 95, 523);
// console.log(run1, cycling1);

////////////////////////////
// APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Get User Position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach Event Handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(`https://www.google.ca/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel); // setView([coordinates], zoomLevel)
    //   console.log(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    L.marker(coords)
      .addTo(this.#map)
      .bindPopup('A pretty CSS3 popup.<br> Easily customizable.')
      .openPopup();

    // Custom Leaflet event handler to handle clicks on map (retains coordinates/other map data)
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs must be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs must be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);
    // console.log(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Clear input fields + hide form

    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(`${workout.description} ${'running' ? '🏃‍♂️' : '🚴‍♀️'}`)
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          `;
    if (workout.type === 'running') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
        `;
    }

    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevation}</span>
            <span class="workout__unit">m</span>
        </div>
      </li>
        `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    // console.log(workoutEl);

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    // console.log(workout);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });

    // Using the public interface

    // NOTE: When recovering data from localStorage (converting JSON string back to multiple objects), we lose the prototype chain which contains those object methods. As such, click() will not work when reloaded from localStorage
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    // Need to reconstruct objects from parsed data to reconnect them to their prototypes

    // console.log(data);
    // Notice that properties are restored but prototype does not contain defined object methods

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();

///////////////////////
// LECTURES
///////////////////////

// LECTURE 1: HOW TO PLAN A WEB PROJECT

// 1) User Stories ---> 2) Features ---> 3) Flowchart ---> 4) Architecture ---> Development Phase

// User Stories -- Description of the application's functionality from various users' perspectives
// All user stories put together describe the entire application

// Features -- A description of all of the features the application must have to make the user stories possible

// Flowchart -- A flowchart describing WHAT we will build

// Architecture -- A framework of HOW we will build each part of the flowchart

// USER STORIES
// Common format: As a [type of user] (Who? User, Admin, etc.), I want [an action](What?) so that [a benefit](Why?)

// As a user, I want to log my running workouts with location, distance, time, pace and steps/minute, so I can keep a log of all my running

// As a user, I want to log my cycling workouts with location, distance, time, speed, and elevation gain so I can keep a log of all my cycling

// As a user, I want to see all my workouts at a glance, so I can easily track my progress over time

// As a user, I want to see all my workouts on a map, so I can easily track where I work out the most

// As a user, I want to see all my workouts when I leave the app and come back later, so that I can keep using the app over time

// FEATURES
// User Stories ---> Features

// 1) Log my running workouts with location, distance, time, pace and steps/minute -->
//     - Map where user clicks to add new workout
//     - Geolocation to display map at current location
//     - Form to input distance, time, pace and steps/minute

// 2) Log my cycling workouts with location, distance, time, speed, and elevation gain -->
//     - Form to input distance, time, speed and elevation gain

// 3) See all my workouts at a glance -->
//     - Display all workouts in a list

// 4) See all my workouts on a map -->
//     - Display all workouts on the map

// 5) See all my workouts when I leave the app and come back later -->
//     - Store workout data in the browser using local storage API
//     - On page load, read the saved data from local storage and display

// FLOWCHART
// (see flowchart file)

// ARCHITECTURE
// (see architecture file)
