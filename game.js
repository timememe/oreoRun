// Глобальные настройки игры
let language = 'ru';
let gameSpeed = 0.1; // Скорость движения объектов

// Разделение полос
let laneSeparationTopRatio = 0.075;    // 5% от ширины экрана
let laneSeparationBottomRatio = 0.2; // 10% от ширины экрана

// Длина линии полосы как доля от высоты экрана
let laneLengthRatio = 0.6275; // 80% от высоты экрана

// Глобальные переменные для размеров текстур (как доля от высоты экрана)
let PLAYER_SIZE_RATIO = 0.06;       // 7% от высоты экрана
let OBSTACLE_SIZE_RATIO = 0.06;    // 6% от высоты экрана
let COLLECTIBLE_SIZE_RATIO = 0.04; // 4% от высоты экрана

// Игровые переменные
let canvas, ctx;
let engine, world;
let render;
let player;
let obstacles = [];
let collectibles = [];
let lanes = [];     // Массив для хранения координат полос (нижняя часть)
let topLanes = [];  // Массив для хранения координат полос (верхняя часть)
let currentLane = 1; // Текущая полоса (0 - левая, 1 - средняя, 2 - правая)
let score = 0;
let isGameOver = false;

// Параметры перспективы
let horizonY; // Y-координата горизонта
let vanishingPointX; // X-координата точки схождения (середина экрана)
let spawnY; // Y-координата точки спавна объектов

const topBackgroundURL = 'assets/logo.png'; 

// Переводы
const translations = {
    en: {
        gameTitle: "Endless Runner",
        tutorialText: "Avoid obstacles and collect items! \n Use arrow keys to switch lanes.",
        startGame: "Start Game",
        victory: "You Win!",
        defeat: "Game Over",
        restartGame: "Restart Game",
        score: "Score: \n",
        backButtonText: "Back"
    },
    ru: {
        gameTitle: "Инструкция",
        tutorialText: "Избегайте препятствий и соберите предметы! \n Используйте стрелки для смены полосы.",
        startGame: "Начать игру",
        victory: "Вы выиграли!",
        defeat: "Не вышло, попробуйте снова!",
        restartGame: "Начать заново",
        score: "Счет: \n",
        backButtonText: "Назад"
    },
    // Добавьте остальные переводы...
};

// Изображения
let images = {};
function preloadImages() {
    images.player = new Image();
    images.player.src = 'assets/player.png';

    images.wall = new Image();
    images.wall.src = 'assets/wall.png';

    images.coin = new Image();
    images.coin.src = 'assets/coin.png';

    images.milk = new Image();
    images.milk.src = 'assets/milk.png';

    images.bg = [];
    for (let i = 1; i <= 9; i++) {
        images.bg[i] = new Image();
        images.bg[i].src = `assets/bg${i}.png`;
    }
}

// Переменные для фоновой анимации
let bgFrameIndex = 9; // Начинаем с bg9.png перед стартом игры
let bgAnimationSpeed = 5; // Скорость смены кадров фона
let bgAnimationCounter = 0;

// Инициализация игры и событий
document.addEventListener('DOMContentLoaded', () => {
    // Инициализация canvas
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // Предзагрузка изображений
    preloadImages();

    // Инициализация UI
    initUI();

    // Изменение размера canvas
    resizeCanvas();

    // Добавление обработчиков событий
    window.addEventListener('resize', resizeCanvas);
    document.getElementById('start-button').addEventListener('click', startGame);
    document.getElementById('restart-button').addEventListener('click', restartGame);

    // Обработчик нажатия клавиш
    document.addEventListener('keydown', handleKeyDown);
});

// Инициализация UI
function initUI() {
    bgFrameIndex = 9; // Отображаем bg9.png перед стартом игры
    const lang = translations[language];
    document.getElementById('game-title').innerText = lang.gameTitle;
    document.getElementById('tutorial-text').innerText = lang.tutorialText;
    document.getElementById('start-button').innerText = lang.startGame;
    document.getElementById('back-button').innerText = lang.backButtonText;
    document.getElementById('end-title').innerText = '';
    document.getElementById('restart-button').innerText = '';
    document.getElementById('end-popup').style.display = 'none';
    document.getElementById('start-popup').style.display = 'flex';
    document.getElementById('game-canvas').style.display = 'none';

    // Создаем элемент для отображения счета
    let scoreElement = document.getElementById('score');
    if (!scoreElement) {
        scoreElement = document.createElement('div');
        scoreElement.id = 'score';
        scoreElement.style.position = 'absolute';
        scoreElement.style.top = '10px';
        scoreElement.style.left = '10px';
        scoreElement.style.color = '#fff';
        scoreElement.style.fontSize = '24px';
        scoreElement.style.textShadow = '1px 1px 2px #000';
        document.getElementById('game-container').appendChild(scoreElement);
    }
    scoreElement.innerText = lang.score + '0';

    let topBackground = document.getElementById('top-background');
    if (!topBackground) {
        topBackground = document.createElement('img');
        topBackground.id = 'top-background';
        topBackground.src = topBackgroundURL;
        topBackground.style.position = 'absolute';
        topBackground.style.top = '0';
        topBackground.style.left = '0';
        topBackground.style.width = '100%';
        topBackground.style.height = 'auto';
        topBackground.style.zIndex = '0'; // За канвасом
        document.getElementById('game-container').appendChild(topBackground);
    }
}

function startTimer() {
    timeLeft = 120;
    updateTimerDisplay();
    gameTimer = setInterval(function() {
        timeLeft--;
        if (timeLeft <= 0) {
            clearInterval(gameTimer);
            isGameOver = true;
            endGame(false);
            Matter.Render.stop(render);
            Matter.Engine.clear(engine);
        } else {
            updateTimerDisplay();
        }
    }, 1000);
}

function updateTimerDisplay() {
    let minutes = Math.floor(timeLeft / 60);
    let seconds = timeLeft % 60;
    let timeString = minutes + ':' + (seconds < 10 ? '0' + seconds : seconds);
    document.getElementById('timer-value').innerText = timeString;
}

// Начать игру
function startGame() {
    bgFrameIndex = 1; // Начинаем анимацию фона с bg1.png
    document.getElementById('start-popup').style.display = 'none';
    document.getElementById('game-canvas').style.display = 'block';
    initGame();
    startTimer();
}

// Инициализация игры
function initGame() {
    isGameOver = false;
    score = 0;
    obstacles = [];
    collectibles = [];
    currentLane = 1; // Начинаем с центральной полосы
    gameSpeed = 0.1; // Сбрасываем скорость

    // Создаем физический движок Matter.js
    engine = Matter.Engine.create();
    world = engine.world;

    // Создаем рендерер
    render = Matter.Render.create({
        canvas: canvas,
        engine: engine,
        options: {
            width: canvas.width,
            height: canvas.height,
            wireframes: false,
            background: '#0058C9', // Фон игры
        }
    });

    // Определяем параметры перспективы
    horizonY = canvas.height - (canvas.height * laneLengthRatio); // Горизонт на основе пропорции
    vanishingPointX = canvas.width / 2; // Точка схождения в середине экрана
    spawnY = horizonY; // Точка спавна немного выше горизонта

    // Определяем разделение полос на основе пропорций
    let laneSeparationTop = canvas.width * laneSeparationTopRatio;
    let laneSeparationBottom = canvas.width * laneSeparationBottomRatio;

    // Определяем базовые X позиции полос на уровне игрока (нижняя часть экрана)
    lanes = [
        vanishingPointX - laneSeparationBottom, // Левая полоса
        vanishingPointX,                        // Средняя полоса
        vanishingPointX + laneSeparationBottom  // Правая полоса
    ];

    // Определяем верхние позиции полос на основе laneSeparationTop
    topLanes = [
        vanishingPointX - laneSeparationTop, // Левая верхняя полоса
        vanishingPointX,                     // Средняя верхняя полоса
        vanishingPointX + laneSeparationTop  // Правая верхняя полоса
    ];

    // Вычисляем размеры текстур на основе пропорций
    PLAYER_SIZE = canvas.height * PLAYER_SIZE_RATIO;
    OBSTACLE_SIZE = canvas.height * OBSTACLE_SIZE_RATIO;
    COLLECTIBLE_SIZE = canvas.height * COLLECTIBLE_SIZE_RATIO;

    //console.log('lanes:', lanes);
    //console.log('topLanes:', topLanes);
    //console.log('horizonY:', horizonY);
    //console.log('spawnY:', spawnY);
    //console.log('PLAYER_SIZE:', PLAYER_SIZE);
    //console.log('OBSTACLE_SIZE:', OBSTACLE_SIZE);
    //console.log('COLLECTIBLE_SIZE:', COLLECTIBLE_SIZE);

    // Создаем игрока
    createPlayer();

    // Запускаем физический движок
    Matter.Engine.run(engine);

    // Запускаем рендерер
    Matter.Render.run(render);

    // Добавляем обработчики событий
    Matter.Events.on(engine, 'beforeUpdate', gameLoop);
    Matter.Events.on(engine, 'collisionStart', handleCollision);
    Matter.Events.on(render, 'afterRender', renderScene);
}

// Создание игрока
function createPlayer() {
    let laneIndex = currentLane;
    let laneX = lanes[laneIndex];
    let playerY = canvas.height - (canvas.height * 0.2); // 10% от высоты экрана
    player = Matter.Bodies.rectangle(laneX, playerY, PLAYER_SIZE, PLAYER_SIZE, {
        label: 'player',
        isStatic: false,
        inertia: Infinity, // Предотвращаем вращение
        frictionAir: 0,
        collisionFilter: {
            category: 0x0002,
            mask: 0x0001 | 0x0004 // Столкновения с препятствиями и собираемыми предметами
        },
        render: {
            visible: false // Отрисовываем вручную
        }
    });

    player.laneIndex = laneIndex; // Добавляем laneIndex

    // Фиксируем игрока по вертикали
    player.constraint = Matter.Constraint.create({
        pointA: { x: laneX, y: playerY },
        bodyB: player,
        pointB: { x: 0, y: 0 },
        stiffness: 1,
        length: 0
    });
    Matter.World.add(world, [player, player.constraint]);
}

// Основной цикл игры
function gameLoop() {
    // Удаляем препятствия и предметы, вышедшие за пределы экрана
    obstacles = obstacles.filter(obstacle => {
        if (obstacle.body.position.y - obstacle.size > canvas.height) {
            Matter.World.remove(world, obstacle.body);
            return false;
        }
        return true;
    });

    collectibles = collectibles.filter(collectible => {
        if (collectible.body.position.y - collectible.size > canvas.height) {
            Matter.World.remove(world, collectible.body);
            return false;
        }
        return true;
    });

    // Генерируем новые препятствия и предметы
    if (Math.random() < 0.02) {
        createObstacle();
    }
    if (Math.random() < 0.01) {
        createCollectible();
    }

    // Увеличиваем сложность со временем
    //gameSpeed += 0.001;
}

// Создание препятствия
function createObstacle() {
    let laneIndex = Math.floor(Math.random() * lanes.length);
    let laneX = lanes[laneIndex]; // Спавн на верхней линии
    let obstacleY = spawnY; // Спавн на spawnY
    let obstacleSize = OBSTACLE_SIZE;

    //console.log(`Spawning obstacle at lane ${laneIndex} (x: ${laneX}, y: ${obstacleY})`);

    let obstacle = {
        body: Matter.Bodies.rectangle(laneX, obstacleY, obstacleSize, obstacleSize, {
            label: 'obstacle',
            isStatic: false,
            frictionAir: 0,
            collisionFilter: {
                category: 0x0001,
                mask: 0x0002 // Столкновения только с игроком
            },
            render: {
                visible: false // Отрисовываем вручную
            }
        }),
        laneIndex: laneIndex,
        size: obstacleSize
    };

    // Устанавливаем начальную скорость вниз
    Matter.Body.setVelocity(obstacle.body, { x: 0, y: gameSpeed });

    Matter.World.add(world, obstacle.body);
    obstacles.push(obstacle);
}

// Создание собираемого предмета
function createCollectible() {
    let laneIndex = Math.floor(Math.random() * lanes.length);
    let laneX = lanes[laneIndex]; // Спавн на верхней линии
    let collectibleY = spawnY; // Спавн на spawnY
    let collectibleSize = COLLECTIBLE_SIZE;

    // Случайно выбираем тип предмета
    let types = ['coin', 'milk'];
    let type = types[Math.floor(Math.random() * types.length)];

    //console.log(`Spawning collectible (${type}) at lane ${laneIndex} (x: ${laneX}, y: ${collectibleY})`);

    let collectible = {
        body: Matter.Bodies.circle(laneX, collectibleY, collectibleSize / 2, {
            label: 'collectible',
            isStatic: false,
            frictionAir: 0,
            collisionFilter: {
                category: 0x0004,
                mask: 0x0002 // Столкновения только с игроком
            },
            render: {
                visible: false
            }
        }),
        laneIndex: laneIndex,
        size: collectibleSize,
        type: type // 'coin' или 'milk'
    };

    // Устанавливаем начальную скорость вниз
    Matter.Body.setVelocity(collectible.body, { x: 0, y: gameSpeed });

    Matter.World.add(world, collectible.body);
    collectibles.push(collectible);
}

// Обработка нажатия клавиш
function handleKeyDown(event) {
    if (event.code === 'ArrowLeft' && currentLane > 0) {
        currentLane--;
        updatePlayerPosition();
    } else if (event.code === 'ArrowRight' && currentLane < lanes.length - 1) {
        currentLane++;
        updatePlayerPosition();
    }
}

// Обновление позиции игрока
function updatePlayerPosition() {
    let laneIndex = currentLane;
    let laneX = lanes[laneIndex];
    Matter.Body.setPosition(player, { x: laneX, y: player.position.y });
    // Обновляем привязку
    player.constraint.pointA.x = laneX;
    player.laneIndex = laneIndex; // Обновляем laneIndex
}

// Обработка столкновений
function handleCollision(event) {
    let pairs = event.pairs;
    for (let pair of pairs) {
        let bodies = [pair.bodyA, pair.bodyB];
        if (bodies.includes(player)) {
            let otherBody = bodies.find(b => b !== player);
            if (otherBody.label === 'obstacle') {
                // Столкновение с препятствием
                endGame(false);
            } else if (otherBody.label === 'collectible') {
                // Сбор предмета
                score++;
                updateScore();
                Matter.World.remove(world, otherBody);
                collectibles = collectibles.filter(c => c.body !== otherBody);
            }
        }
    }
}

// Обновление счета
function updateScore() {
    const lang = translations[language];
    let scoreElement = document.getElementById('score-display');
    scoreElement.innerText = lang.score + score;
}

// Завершение игры
function endGame(victory) {
    isGameOver = true;
    const lang = translations[language];
    document.getElementById('end-title').innerText = lang.defeat;
    document.getElementById('restart-button').innerText = lang.restartGame;
    document.getElementById('end-popup').style.display = 'flex';
    document.getElementById('game-canvas').style.display = 'none';
    clearInterval(gameTimer);

    Matter.Engine.clear(engine);
    Matter.Render.stop(render);

    // Удаляем обработчики событий
    Matter.Events.off(engine, 'beforeUpdate', gameLoop);
    Matter.Events.off(engine, 'collisionStart', handleCollision);
    Matter.Events.off(render, 'afterRender', renderScene);
}

// Перезапуск игры
function restartGame() {
    clearInterval(gameTimer); 
    document.getElementById('end-popup').style.display = 'none';
    document.getElementById('game-canvas').style.display = 'block';
    startTimer();
    initGame();    
}

// Отрисовка сцены с перспективой
function renderScene() {
    let context = render.context;
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Отрисовка фона сначала
    context.drawImage(images.bg[bgFrameIndex], 0, 0, canvas.width, canvas.height);

    // Отрисовка дороги
    //drawRoad(context);

    // Отрисовка объектов
    drawObjects(context, obstacles, 'obstacle');
    drawObjects(context, collectibles, 'collectible');

    // Отрисовка игрока
    drawPlayer(context);

    // Обновляем анимацию фона
    updateBackgroundAnimation();
}

// Функция для обновления анимации фона
function updateBackgroundAnimation() {
    bgAnimationCounter++;
    if (bgAnimationCounter >= bgAnimationSpeed) {
        bgAnimationCounter = 0;
        bgFrameIndex++;
        if (bgFrameIndex > 9) {
            bgFrameIndex = 1;
        }
    }
}

// Функция для отрисовки дороги
function drawRoad(context) {
    // Рисуем фон дороги
    context.fillStyle = '#555';
    context.beginPath();
    context.moveTo(0, canvas.height);
    context.lineTo(canvas.width, canvas.height);
    context.lineTo(topLanes[2], horizonY);
    context.lineTo(topLanes[0], horizonY);
    context.closePath();
    context.fill();

    // Отрисовка линий полос
    context.strokeStyle = '#fff';
    context.lineWidth = 2;
    context.setLineDash([20, 40]); // Пунктир: 20px линия, 40px пробел

    for (let i = 0; i < lanes.length; i++) {
        context.beginPath();
        context.moveTo(getScreenX(i, canvas.height), canvas.height);
        context.lineTo(getScreenX(i, horizonY), horizonY);
        context.stroke();
    }

    context.setLineDash([]); // Сброс пунктирной линии
}

// Функция для отрисовки объектов с учетом перспективы
function drawObjects(context, objectsArray, type) {
    for (let obj of objectsArray) {
        let posY = obj.body.position.y;
        if (posY < spawnY || posY > canvas.height) continue;

        let scale = getScale(posY);
        let objX = getScreenX(obj.laneIndex, posY); // Используем laneIndex
        let objY = posY;
        let size = obj.size * scale;

        if (type === 'obstacle') {
            // Отрисовка препятствия
            context.drawImage(images.wall, objX - size / 2, objY - size, size, size);
        } else if (type === 'collectible') {
            // Отрисовка собираемого предмета
            if (obj.type === 'coin') {
                context.drawImage(images.coin, objX - size / 2, objY - size, size, size);
            } else if (obj.type === 'milk') {
                context.drawImage(images.milk, objX - size / 2, objY - size, size, size);
            }
        }
    }
}

// Функция для отрисовки игрока
function drawPlayer(context) {
    let posY = player.position.y;
    let scale = getScale(posY);
    let playerX = getScreenX(player.laneIndex, posY); // Используем laneIndex
    let playerY = posY;
    let size = PLAYER_SIZE * scale;

    context.drawImage(images.player, playerX - size / 2, playerY - size, size, size);
}

// Функция для вычисления масштаба на основе позиции Y
function getScale(y) {
    let maxScale = 1.5;
    let minScale = 0.5;
    let scale = ((y - horizonY) / (canvas.height - horizonY)) * (maxScale - minScale) + minScale;
    return scale;
}

// Функция для получения X позиции на экране с учетом перспективы
function getScreenX(laneIndex, y) {
    let t = (y - spawnY) / (canvas.height * laneLengthRatio);
    t = Math.max(0, Math.min(1, t)); // Ограничиваем t между 0 и 1
    let screenX = topLanes[laneIndex] + (lanes[laneIndex] - topLanes[laneIndex]) * t;
    return screenX;
}

// Изменение размера canvas
function resizeCanvas() {
    if (!canvas) return;

    const desiredAspectRatio = 9 / 16; // Соотношение сторон ширина/высота
    const windowAspectRatio = window.innerWidth / window.innerHeight;

    const container = document.getElementById('game-container');

    if (windowAspectRatio > desiredAspectRatio) {
        // Окно шире, чем необходимо – ограничиваем по высоте
        canvas.height = window.innerHeight;
        canvas.width = canvas.height * desiredAspectRatio;
    } else {
        // Окно уже, чем необходимо – ограничиваем по ширине
        canvas.width = window.innerWidth;
        canvas.height = canvas.width / desiredAspectRatio;
    }

    container.style.width = `${canvas.width}px`;
    container.style.height = `${canvas.height}px`;

    // Обновляем параметры рендерера
    if (render) {
        render.options.width = canvas.width;
        render.options.height = canvas.height;
        render.canvas.width = canvas.width;
        render.canvas.height = canvas.height;

        // Определяем параметры перспективы
        horizonY = canvas.height - (canvas.height * laneLengthRatio); // Горизонт на основе пропорции
        vanishingPointX = canvas.width / 2; // Точка схождения в середине экрана
        spawnY = horizonY - (canvas.height * 0.05); // Точка спавна немного выше горизонта

        // Определяем разделение полос на основе пропорций
        let laneSeparationTop = canvas.width * laneSeparationTopRatio;
        let laneSeparationBottom = canvas.width * laneSeparationBottomRatio;

        // Определяем базовые X позиции полос на уровне игрока (нижняя часть экрана)
        lanes = [
            vanishingPointX - laneSeparationBottom, // Левая полоса
            vanishingPointX,                        // Средняя полоса
            vanishingPointX + laneSeparationBottom  // Правая полоса
        ];

        // Определяем верхние позиции полос на основе laneSeparationTop
        topLanes = [
            vanishingPointX - laneSeparationTop, // Левая верхняя полоса
            vanishingPointX,                     // Средняя верхняя полоса
            vanishingPointX + laneSeparationTop  // Правая верхняя полоса
        ];

        // Вычисляем размеры текстур на основе пропорций
        PLAYER_SIZE = canvas.height * PLAYER_SIZE_RATIO;
        OBSTACLE_SIZE = canvas.height * OBSTACLE_SIZE_RATIO;
        COLLECTIBLE_SIZE = canvas.height * COLLECTIBLE_SIZE_RATIO;

        //console.log('lanes:', lanes);
        //console.log('topLanes:', topLanes);
        //console.log('horizonY:', horizonY);
        //console.log('spawnY:', spawnY);
        //console.log('PLAYER_SIZE:', PLAYER_SIZE);
        //console.log('OBSTACLE_SIZE:', OBSTACLE_SIZE);
        //console.log('COLLECTIBLE_SIZE:', COLLECTIBLE_SIZE);

        // Обновляем позицию игрока
        if (player) {
            updatePlayerPosition();
        }
    }
}
