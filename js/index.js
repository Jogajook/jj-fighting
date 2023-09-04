// @ts-nocheck

function log(title, obj) {
    console.log(`${title}: \n `, JSON.stringify(obj, null, 2));
}

const KEY_CODES = {
    User1MoveLeft: 'ArrowLeft',
    User1MoveRight: 'ArrowRight',
    User1Jump: 'ArrowUp',
    User1Kick: 'Space',
    User1Fire: 'Enter',

    User2MoveLeft: 'KeyA',
    User2MoveRight: 'KeyD',
    User2Jump: 'KeyW',
    User2Kick: 'KeyF',
    User2Fire: 'KeyR',
};

const GAME_EVENTS = {
    TryMoveRight: 'TryMoveRight',
    TryJump: 'TryJump',
    TryMoveLeft: 'TryMoveLeft',
    Kick: 'Kick',
    Kicked: 'Kicked',
};

const INTERACTION_TYPE = {
    Kicked: 'Kicked',
};

class User {
    name = '';
    character = '';
    isComp = false;
    isKicked = false;
    isKicking = false;
    isDirectedRight = true;
    isJumping = false;
    isLanding = false;
    health = 10;
    skin = '';
    imgs = {
        kicked: '',
        fire: ''
    };
    skins = {
        default: '',
        kicking: '',
    };
    sounds = {
        kicking: '',
        jumping: '',
        kicked: ''
    };

    constructor({ name, character, isComp, isDirectedRight, fireImage }) {
        this.name = name;
        this.character = character;
        this.skins.default = `./assets/characters/${this.character}/default.png`;
        this.skins.kicking = `./assets/characters/${this.character}/kicking.png`;
        this.imgs.kicked = `./assets/kicked.png`;
        this.imgs.fire = `./assets/fire/${fireImage}`;
        this.sounds.kicking = `./assets/characters/${this.character}/kicking.m4a`;
        this.sounds.kicked = `./assets/kicked.mp3`;
        this.sounds.jumping = `./assets/characters/${this.character}/jumping.m4a`;
        this.skin = this.skins.default;
        this.isComp = isComp;
        this.isDirectedRight = isDirectedRight;
    }
}

class Fire {
    isKicking = false;
    isDirectedRight = false;

    constructor({ isDirectedRight }) {
        this.isDirectedRight = isDirectedRight;
    }
}

class FireView {

    reactiveModel = null;
    points = [];
    el = null;
    image = '';

    constructor({ containerId, reactiveModel, width, height, xOffset, yOffset, pointSize, image }) {
        this.containerId = containerId;
        this.reactiveModel = reactiveModel;
        this.pointSize = pointSize;
        this.width = width;
        this.height = height;
        this.points = this.rectToCells({ width, height, xOffset, yOffset });
        this.image = image;

        this.model = reactiveModel.getModel()

        const unSubModelChange = reactiveModel.onChange(({ model }) => {
            this.model = model;
            this.render();
        });

        const unSubIsKickingModelChange = reactiveModel.onPropChange('isKicking', ({ value }) => {
            if (value) {
                unSubModelChange();
                unSubIsKickingModelChange();
                this.destroy();
            }
        });
    }

    setParent(parentView) {
        this.parent = parentView;
    }

    getPoints() {
        return this.points;
    }

    setPoints(points) {
        this.points = points;
        this.render();
    }

    rectToCells({ xOffset, yOffset, width, height }) {
        let points = [];
        for (let row = yOffset; row < (height + yOffset); row++) {
            for (let col = xOffset; col < (width + xOffset); col++) {
                points.push({
                    x: col,
                    y: row
                });
            }
        }
        return points;
    }

    destroy() {
        this.parent.removeChildView({ view: this, element: this.el });
    }

    render() {
        if (this.el === null) {
            const element = document.createElement('img');
            element.src = this.image;
            element.classList.add('scene-object', 'fire-object');
            const container = document.getElementById(this.containerId);
            container.appendChild(element);
            this.el = element;
        }

        const xPoint = Math.min(...this.points.map(item => item.x));
        const left = xPoint * this.pointSize;
        const yPoint = Math.max(...this.points.map(item => item.y));

        const parentPoints = this.parent.getPoints();
        const yParentPoint = Math.max(...parentPoints.map(item => item.y));

        const topDiff = yParentPoint - yPoint;
        const top = (topDiff * this.pointSize);

        this.el.style.top = `${top}px`;
        this.el.style.left = `${left}px`;
        this.el.style.width = `${this.width * this.pointSize}px`;
        this.el.style.height = `${this.height * this.pointSize}px`;

        this.el.innerHTML = 'FIRE!'
    }
}

class ScoreView {
    rUser1 = null;
    rUser2 = null;
    parent = null;
    model = {
        user1: {
            name: '',
            health: 0
        },
        user2: {
            name: '',
            health: 0
        }
    }

    constructor({ containerId, rUser1, rUser2 }) {
        this.containerId = containerId;
        this.rUser1 = rUser1;
        this.rUser2 = rUser2;

        const user1 = this.rUser1.getModel();
        this.model.user1.name = user1.name;
        this.model.user1.health = user1.health;

        const user2 = this.rUser2.getModel();
        this.model.user2.name = user2.name;
        this.model.user2.health = user2.health;

        this.rUser1.onPropChange('health', ({ value }) => {
            this.model.user1.health = value;
            this.render();
        });

        this.rUser2.onPropChange('health', ({ value }) => {
            console.log('health', value)
            this.model.user2.health = value;
            this.render();
        });
    }

    setParent(parentView) {
        this.parent = parentView;
    }

    getPoints() {
        return [];
    }

    setPoints(points) {}

    render() {
        const users = [this.model.user1, this.model.user2];
        const cols = users.map(user => {
            return `
                <div class="score__user">
                    <div class="score__user-name">${user.name}</div>
                    <div class="score__user-health">${user.health}</div>
                </div>
            `
        });
        const wrapper = `
            ${cols.join('')}
        `;
        document.getElementById(this.containerId).innerHTML = wrapper;
    }
}

class CharacterSelectorView {

    onCharactersSelectedListeners = [];
    
    okButtonId = 'character-selector-btn';
    character1SelectorId = 'user-1-character';
    character2SelectorId = 'user-2-character';

    constructor({ containerId, characters }) {
        this.containerId = containerId;
        this.characters = characters;
    }

    subscribeCharactersSelected(cb) {
        const includes = this.onCharactersSelectedListeners.includes(cb);
        if (!includes) {
            this.onCharactersSelectedListeners.push(cb);
        }
        return () => {
            const indx = this.onCharactersSelectedListeners.indexOf(cb);
            if (indx >= 0) {
                this.onCharactersSelectedListeners.splice(indx, 1);
            }
        };
    }

    notifyOnCharactersSelected() {
        const user1Selector = document.getElementById(this.character1SelectorId);
        const originalChar1 = this.characters[parseInt(user1Selector.value, 10)];
        const char1Clone =  {...originalChar1};
        Object.setPrototypeOf(char1Clone, originalChar1);
        
        const user2Selector = document.getElementById(this.character2SelectorId);
        const originalChar2 = this.characters[parseInt(user2Selector.value, 10)];
        const char2Clone =  {...originalChar2};
        Object.setPrototypeOf(char2Clone, originalChar2);

        const data = {
            user1Character: char1Clone,
            user2Character: char2Clone,
        };

        this.onCharactersSelectedListeners.forEach(cb => cb(data));
    }

    bindEvents() {
        const button = document.getElementById(this.okButtonId);
        button.addEventListener('click', () => {
            this.notifyOnCharactersSelected();
        });
    }

    destroy() {
        document.getElementById(this.containerId).innerHTML = '';
    }

    render() {
        const cols = [this.character1SelectorId, this.character2SelectorId].map(id => {
            return `
                <div class="character-selector__user">
                    <div class="character-selector__title">User ${id === this.character1SelectorId ? '1' : '2'}</div>
                    <div class="character-selector__content">
                        <select name="${id}" id="${id}">
                            ${this.characters.map((item, charIndex) => {
                                return `
                                    <option value="${charIndex}" 
                                        ${id === this.character1SelectorId && charIndex === 0 ? "selected" : ''}
                                        ${id === this.character2SelectorId && charIndex === 1 ? "selected" : ''}>
                                        ${item.getDisplayName()}
                                    </option>
                                    `;
                                })}
                        </select>
                    </div>
                </div>
            `;
        });

        const wrapper = `
            <div class="character-selector">
                ${cols.join('')}
                <div id="${this.okButtonId}" class="character-selector__btn-wrapper">
                    <button>OK</button>
                </div>
            </div>
        `;

        document.getElementById(this.containerId).innerHTML = wrapper;
        this.bindEvents();
    }
}

class UserView {
    reactiveModel = null;
    audioManager = null;
    parent = null;
    model = null;
    points = [];

    constructor({ containerId, audioManager, reactiveModel, width, height, xOffset, pointSize, jumpHeight, jumpStepTime }) {
        this.containerId = containerId;
        this.audioManager = audioManager;
        this.reactiveModel = reactiveModel;
        this.width = width;
        this.height = height;
        this.pointSize = pointSize;
        this.jumpHeight = jumpHeight;
        this.jumpStepTime = jumpStepTime;
        this.points = this.rectToCells({ xOffset, width, height });

        this.model = reactiveModel.getModel()

        reactiveModel.onChange(({ model }) => {
            log(`reactiveModel - ${containerId}`, model);
            this.model = model;
            this.render();
        });

        reactiveModel.onPropChange('isKicking', ({ value }) => {
            if (value) {
                reactiveModel.setPropValue('skin', this.model.skins.kicking);
                this.audioManager.play(this.model.sounds.kicking);
            } else {
                reactiveModel.setPropValue('skin', this.model.skins.default);
            }
        });

        reactiveModel.onPropChange('isJumping', ({ value }) => {
            if (value) {
                this.audioManager.play(this.model.sounds.jumping);
            }
        });

        reactiveModel.onPropChange('isKicked', ({ value }) => {
            if (value) {
                this.audioManager.play(this.model.sounds.kicked);
            }
        });
    }

    setParent(parentView) {
        this.parent = parentView;
    }

    rectToCells({ xOffset, width, height }) {
        let points = [];
        for (let row = 0; row < height; row++) {
            for (let col = xOffset; col < (width + xOffset); col++) {
                points.push({
                    x: col,
                    y: row
                });
            }
        }
        return points;
    }

    getPoints() {
        return this.points;
    }

    setPoints(points) {
        this.points = points;
        this.render();
    }

    moveRight() {
        if (this.parent.canMoveRight({ view: this })) {
            this.parent.moveRight({ view: this });
        }
    }

    moveLeft() {
        if (this.parent.canMoveLeft({ view: this })) {
            this.parent.moveLeft({ view: this });
        }
    }

    render() {

        const xPoint = Math.min(...this.points.map(item => item.x));
        const left = xPoint * this.pointSize;
        const yPoint = Math.max(...this.points.map(item => item.y));

        const parentPoints = this.parent.getPoints();
        const yParentPoint = Math.max(...parentPoints.map(item => item.y));

        const topDiff = yParentPoint - yPoint;

        const top = (topDiff * this.pointSize);

        const output = `
            <img class="user" style="${this.model.isDirectedRight ? '' : "transform: scaleX(-1)"}" src="${this.model.skin}">
            <img class="user-kicked" 
                style="display: ${this.model.isKicked ? "inline" : "none"};
                ${this.model.isDirectedRight ? "right: 40%" : "left: 40%"}"
                src="${this.model.imgs.kicked}">
        `;

        const container = document.getElementById(this.containerId);
        container.innerHTML = output;
        container.style.left = `${left}px`;
        container.style.top = `${top}px`;
        container.style.width = `${this.width * this.pointSize}px`;
        container.style.height = `${this.height * this.pointSize}px`;
    }
}


class GameView {

    points = [];
    onMoveListeners = [];
    onInteractionListeners = [];

    constructor({ containerId, bgImage, width, height, pointSize, childViews }) {
        this.containerId = containerId;
        this.bgImage = bgImage;
        this.width = width;
        this.height = height;
        this.pointSize = pointSize;
        this.childViews = childViews;
        this.points = this.rectToCells({ width, height });
        childViews.forEach(view => view.setParent(this));
    }

    addChildView({ view }) {
        view.setParent(this);
        this.childViews.push(view);
        view.render();
    }

    removeChildView({ view, element }) {
        const indx = this.childViews.indexOf(view);
        if (indx === -1) {
            return;
        }
        this.childViews.splice(indx, 1);
        if (element) {
            element.remove();
            return;
        }
        const el = document.getElementById(view.containerId);
        el.remove();
    }

    render() {
        let rows = [];
        for (let row = this.height - 1; row >= 0; row--) {
            let rowStr = `<div class="row">`;
            const cols = [];
            for (let col = 0; col < this.width; col++) {
                cols.push(`<div class="cell" style="width: ${this.pointSize}px; height: ${this.pointSize}px;"></div>`);
            }
            let colsStr = cols.join('');
            rowStr += colsStr;
            rowStr += '</div>';
            rows.push(rowStr);
        }
        const rowsStr = rows.join('');
        const wrapper = `
        <div id="game-wrapper" class="game-wrapper" style="width: ${this.width * this.pointSize}px; height: ${this.height * this.pointSize}px; background-image: url(${this.bgImage})">
            <div id="score">
                
            </div>
            <div class="cell-wrapper" style="width: ${this.width * this.pointSize}px; height: ${this.height * this.pointSize}px">
                ${rowsStr}
            </div>
            <div class="scene-object" id="user1"></div>
            <div class="scene-object" id="user2"></div>
            <div class="scene-object" id="user-character-container">
            </div>
            <audio class="sound-object" id="user1-sound"></audio>
            <audio class="sound-object" id="user2-sound"></audio>
            <div class="scene-object" id="fire-object-container">
                
            </div>
        </div>
            `;

        document.getElementById(this.containerId).innerHTML = wrapper;

        this.childViews.forEach(item => item.render());
    }

    rectToCells({ width, height }) {
        let points = [];
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                points.push({
                    x: col,
                    y: row
                });
            }
        }
        return points;
    }

    getPoints() {
        return this.points;
    }

    setPoints(points) {
        this.points = points;
    }

    subscribeOnMove(cb) {
        const includes = this.onMoveListeners.includes(cb);
        if (!includes) {
            this.onMoveListeners.push(cb);
        }
        return () => {
            const indx = this.onMoveListeners.indexOf(cb);
            if (indx >= 0) {
                this.onMoveListeners.splice(indx, 1);
            }
        };
    }

    notifyOnMove({ view }) {
        this.onMoveListeners.forEach(cb => cb({ view }));
    }

    getIntersectedViewRight({ view }) {
        const nextViewPoints = getNextRightPoints({ view });
        const otherViews = this.childViews
            .filter(item => item !== view);
        return nextViewPoints
            .find(otherViews.some(ow => ow.getPoints().find(owp => owp.x === item.x && owp.y === item.y)));
    }

    getIntersectedViewByPoints(nextViewPoints) {
        return this.childViews
            .find(
                item => item.getPoints()
                    .some(owp => nextViewPoints.some(p => p.x === owp.x && p.y === owp.y))
            );
    }

    getIntersectedView({ view, nextViewPoints }) {
        const otherViews = this.childViews
            .filter(item => item !== view);
        return otherViews
            .find(
                item => item.getPoints()
                    .some(owp => nextViewPoints.some(p => p.x === owp.x && p.y === owp.y))
            );
    }

    getIntersectedViewRight({ view }) {
        return this.getIntersectedView({
            view,
            nextViewPoints: this.getNextRightPoints({ view })
        });
    }

    getIntersectedViewLeft({ view }) {
        return this.getIntersectedView({
            view,
            nextViewPoints: this.getNextLeftPoints({ view })
        });
    }

    isOutOfView(points) {
        const maxX = this.width - 1;
        const maxY = this.height - 1;
        return points.some(p => p.x < 0 || p.x > maxX || p.y < 0 || p.y > maxY);
    }

    getIntersectedViewOrOutOfView(points) {
        const intView = this.getIntersectedViewByPoints(points);
        if (intView) {
            return intView;
        }
        const isOutOfView = this.isOutOfView(points);
        if (isOutOfView) {
            return true;
        }
        return null;
    }

    canMove({ view, nextViewPoints }) {
        const outOrIntersects = nextViewPoints
            .some(item => this.isOutOfView([{ x: item.x, y: item.y }])
                || this.getIntersectedView({ view, nextViewPoints })
            );
        return !outOrIntersects;
    }

    move({ view, mapFn }) {
        view.setPoints(
            mapFn({ view })
        );
        this.notifyOnMove({ view });
    }

    getNextRightPoints({ view }) {
        return view.getPoints().map(item => {
            return {
                ...item,
                x: item.x + 1,
            }
        });
    }

    canMoveRight({ view }) {
        return this.canMove({
            view,
            nextViewPoints: this.getNextRightPoints({ view })
        });
    }

    moveRight({ view }) {
        this.move({ view, mapFn: this.getNextRightPoints });
    }

    getNextLeftPoints({ view }) {
        return view.getPoints().map(item => {
            return {
                ...item,
                x: item.x - 1,
            }
        });
    }

    canMoveLeft({ view }) {
        return this.canMove({
            view,
            nextViewPoints: this.getNextLeftPoints({ view })
        });
    }

    moveLeft({ view }) {
        this.move({ view, mapFn: this.getNextLeftPoints });
    }

    getNextUpPoints({ view }) {
        return view.getPoints().map(item => {
            return {
                ...item,
                y: item.y + 1,
            }
        })
    }

    canMoveUp({ view }) {
        return this.canMove({
            view,
            nextViewPoints: this.getNextUpPoints({ view })
        });
    }

    moveUp({ view }) {
        this.move({ view, mapFn: this.getNextUpPoints });
    }

    getNextDownPoints({ view }) {
        return view.getPoints().map(item => {
            return {
                ...item,
                y: item.y - 1,
            }
        })
    }

    canMoveDown({ view }) {
        return this.canMove({
            view,
            nextViewPoints: this.getNextDownPoints({ view })
        });
    }

    moveDown({ view }) {
        this.move({ view, mapFn: this.getNextDownPoints });
    }

    subscribeOnInteraction(cb) {
        const includes = this.onInteractionListeners.includes(cb);
        if (!includes) {
            this.onInteractionListeners.push(cb);
        }
        return () => {
            const indx = this.onInteractionListeners.indexOf(cb);
            if (indx >= 0) {
                this.onInteractionListeners.splice(indx, 1);
            }
        };
    }

    notifyOnInteraction({ source, target, interactionType }) {
        this.onInteractionListeners.forEach(cb => cb({ source, target, interactionType }));
    }

}

class GameActionQueue {

    actions = [];

    constructor({ timeout }) {
        this.timeout = timeout;
    }

    start() {
        this.interval = setInterval(() => {
            const act = this.actions.shift();
            if (typeof act === 'function') {
                act();
            }
        }, this.timeout);
    }

    stop() {
        clearInterval(this.interval);
    }

    add(cb) {
        this.actions.push(cb);
    }
}

function makeReactive({ model }) {
    const subs = [];
    const anyProp = '__anyProp__';

    function getSubIndex(prop, cb) {
        return subs
            .findIndex(item =>
                item.prop === prop && item.cb === cb);
    }

    function getSub(prop, cb) {
        const indx = getSubIndex(prop, cb);
        if (indx !== -1) {
            return subs[indx];
        }
    }

    function onPropChange(prop, cb) {
        const sub = getSub(prop, cb);
        if (!sub) {
            subs.push({
                prop,
                cb
            });
        }
        return () => {
            const indx = getSubIndex(prop, cb);
            subs.splice(indx, 1);
        };
    }

    function notifyPropChange(prop) {
        subs
            .filter(item => item.prop === prop)
            .forEach(item => {
                const prevValue = model[prop];
                const value = model[prop];
                return item.cb({
                    prop,
                    value,
                    prevValue,
                    model
                });
            });
    }

    function setPropValue(prop, value) {
        model[prop] = value;
        notifyPropChange(prop);
        notifyChange();
    }

    function getPropValue(prop) {
        return model[prop];
    }

    function unSubAll() {
        subs.splice(0, subs.length);
    }

    function onChange(cb) {
        return onPropChange(anyProp, cb);
    }

    function notifyChange() {
        subs
            .filter(item => item.prop === anyProp)
            .forEach(item => {
                return item.cb({
                    model
                });
            });
    }

    function getModel() {
        return model;
    }

    return {
        onPropChange,
        setPropValue,
        getPropValue,
        onChange,
        unSubAll,
        getModel,
    };
}

class EventBus {
    subs = {};

    onEvent(eventName, cb) {
        this.subs[eventName] = this.subs[eventName] || [];
        const listener = this.subs[eventName].find(item => item === cb);
        if (!listener) {
            this.subs[eventName].push(cb);
        }
        return () => {
            const indx = this.subs[eventName].find(item => item === cb);
            if (indx !== -1) {
                this.subs[eventName].splice(indx, 1);
            }
        };
    }

    dispatchEvent(eventName, data) {
        const listeners = this.subs[eventName];
        if (!Array.isArray(listeners)) {
            return;
        }
        listeners.forEach(cb => cb(data));
    }

    unSubAll() {
        this.subs = {};
    }

}

class KeyboardListener {

    onPressKeys(keyCodes, cb) {
        const listener = ({ code }) => {
            console.log('code', code)
            if (keyCodes.includes(code)) {
                cb({ code });
            }
        };
        window.document.addEventListener('keyup', listener);
        return () => {
            window.document.removeEventListener('keyup', listener);
        };
    }

}


const throttle = (func, delay) => {
    let prev = 0;
    return (...args) => {
        let now = new Date().getTime();
        if (now - prev > delay) {
            prev = now;
            return func(...args);
        }
    }
};

function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

class Character {

    offset = 2;
    isDirectedRight = false;

    constructor({ name, canvasWidth, width, height, fireImage }) {
        this.name = name;
        this.canvasWidth = canvasWidth;
        this.width = width;
        this.height = height;
        this.fireImage = fireImage;
    }

    getOffset() {
        if (this.isDirectedRight) {
            return this.offset;
        }
        return this.canvasWidth - this.width - this.offset;
    }

    getDisplayName() {
        return this.name.charAt(0).toUpperCase() + this.name.slice(1);
    }
}

class AudioManager {

    constructor({ containerId }) {
        this.containerId = containerId;
    }

    play(soundUrl) {
        const el = document.getElementById(this.containerId);
        if (el) {
            el.src = soundUrl;
            el.play();
        }
    }
}

class CommandExecutor {
    commands = [];

    async storeAndExecute(command) {
        await command.execute();
        this.commands.push(command);
    }
}

class CommandJump {

    constructor({ view }) {
        this.view = view;
    }

    async execute() {
        if (this.view.model.isJumping || this.view.model.isLanding) {
            return;
        }
        const steps = Array.from(Array(this.view.jumpHeight).keys());
        for await (const step of steps) {
            const isMoved = await new Promise((resolve) => {
                if (step === 0) {
                    if (this.view.parent.canMoveUp({ view: this.view })) {
                        if (step === 0) {
                            this.view.reactiveModel.setPropValue('isJumping', true);
                        }
                        this.view.parent.moveUp({ view: this.view });
                        return resolve(true);
                    } else {
                        return resolve(false);
                    }
                }
                setTimeout(() => {
                    if (this.view.parent.canMoveUp({ view: this.view })) {
                        this.view.parent.moveUp({ view: this.view });
                        return resolve(true);
                    } else if (this.view.model.isJumping) {
                        return resolve(false);
                    }
                }, this.view.jumpStepTime);
            });
            if (!isMoved) {
                break;
            }
        }
        this.view.reactiveModel.setPropValue('isJumping', false);
    }
}

class CommandLand {

    constructor({ view }) {
        this.view = view;
    }

    async execute() {
        if (this.view.model.isJumping || this.view.model.isLanding) {
            return;
        }
        if (this.view.parent.canMoveDown({ view: this.view })) {
            this.view.reactiveModel.setPropValue('isLanding', true);
        }
        const steps = Array.from(Array(999999).keys());
        for await (const _ of steps) {
            const isMoved = await new Promise((resolve) => {
                setTimeout(() => {
                    if (this.view.parent.canMoveDown({ view: this.view })) {
                        this.view.parent.moveDown({ view: this.view });
                        return resolve(true);
                    } else {
                        return resolve(false);
                    }
                }, this.view.jumpStepTime);
            });
            if (!isMoved) {
                break;
            }
        }
        this.view.reactiveModel.setPropValue('isLanding', false);
    }
}

class CommandKick {

    constructor({ view }) {
        this.view = view;
    }

    async execute() {
        this.view.reactiveModel.setPropValue('isKicking', true);
        const interactionDuration = 1000;
        const targetView = this.view.model.isDirectedRight
            ? this.view.parent.getIntersectedViewRight({ view: this.view })
            : this.view.parent.getIntersectedViewLeft({ view: this.view });
        if (targetView && targetView instanceof UserView) {
            const target = targetView.reactiveModel;
            target.setPropValue('isKicked', true);
            setTimeout(() => {
                target.setPropValue('isKicked', false);
            }, interactionDuration);
            this.view.parent.notifyOnInteraction({
                source: this.view.reactiveModel,
                target,
                interactionType: INTERACTION_TYPE.Kicked
            });
        }
        setTimeout(() => {
            this.view.reactiveModel.setPropValue('isKicking', false);
        }, interactionDuration);
    }
}


class CommandFire {

    constructor({ view, pointSize, commandExecutor, fireStepTime }) {
        this.view = view;
        this.pointSize = pointSize;
        this.commandExecutor = commandExecutor;
        this.fireStepTime = fireStepTime;
    }

    async execute() {
        if (this.view.model.isJumping || this.view.model.isLanding) {
            return;
        }
        const points = this.view.getPoints();
        const minY = Math.min(...points.map(item => item.y));
        const yOffset = minY + 2;
        let xOffset = -1;
        if (this.view.model.isDirectedRight) {
            const maxX = Math.max(...points.map(item => item.x));
            xOffset = maxX;
        } else {
            const minX = Math.min(...points.map(item => item.x));
            xOffset = minX;
        }

        const rFire = makeReactive({
            model: new Fire({
                isDirectedRight: this.view.model.isDirectedRight
            })
        });

        const fireView = new FireView({
            containerId: 'game-wrapper',
            reactiveModel: rFire,
            width: 1, height: 1,
            xOffset, yOffset,
            pointSize: this.pointSize,
            image: this.view.model.imgs.fire
        });
        this.view.parent.addChildView({ view: fireView });
        this.view.audioManager.play('./assets/fire/fire.m4a');

        const steps = Array.from(Array(999999).keys());
        for await (const _ of steps) {
            const shouldProceed = await new Promise((resolve) => {
                setTimeout(() => {
                    const nextPoints = this.view.model.isDirectedRight
                        ? this.view.parent.getNextRightPoints({ view: fireView })
                        : this.view.parent.getNextLeftPoints({ view: fireView });

                    if (this.view.parent.isOutOfView(nextPoints)) {
                        fireView.destroy();
                        return resolve(false);
                    }

                    const intersectedView = this.view.parent.getIntersectedViewByPoints(nextPoints);
                    if (intersectedView instanceof UserView && intersectedView !== this.view) {
                        this.commandExecutor.storeAndExecute(
                            new CommandKick({ view: fireView })
                        );
                        return resolve(false);
                    }

                    fireView.setPoints(nextPoints);
                    return resolve(true);
                }, this.fireStepTime);
            });
            if (!shouldProceed) {
                break;
            }
        }
    }
}

class Game {

    constructor({ canvasWidth, userJumpHeight, userJumpStepTime, fireStepTime, debounceMs }) {

        this.canvasWidth = canvasWidth;
        this.userJumpHeight = userJumpHeight;
        this.userJumpStepTime = userJumpStepTime;
        this.fireStepTime = fireStepTime;
        this.debounceMs = debounceMs;

        const body = document.body;

        this.pointSize = Math.floor(parseInt(body.scrollWidth) / this.canvasWidth);
        this.canvasHeight = Math.floor(parseInt(window.innerHeight) / this.pointSize);
        this.canvasWidth = Math.floor(parseInt(body.scrollWidth) / this.pointSize);

        this.selectUserCharacters()
            .then(data => this.startGame(data));

    }

    selectUserCharacters() {
        return new Promise((resolve) => {
            const characters = [
                new Character({ name: 'zhenia', canvasWidth: this.canvasWidth, width: 4, height: 6, fireImage: 'fire-banana.png' }),
                new Character({ name: 'dino', canvasWidth: this.canvasWidth, width: 4, height: 6, fireImage: 'fire-strawberry.png' }),
                new Character({ name: 'kurka', canvasWidth: this.canvasWidth, width: 4, height: 6, fireImage: 'fire-tomato.gif' }),
                new Character({ name: 'mario', canvasWidth: this.canvasWidth, width: 6, height: 6, fireImage: 'fire-tomato.gif' }),
                new Character({ name: 'bowser', canvasWidth: this.canvasWidth, width: 6, height: 6, fireImage: 'fire-banana.png' }),
            ];

            const characterSelectorView = new CharacterSelectorView({
                containerId: 'character-selector',
                characters
            });
            characterSelectorView.subscribeCharactersSelected((data) => {
                characterSelectorView.destroy();
                resolve(data);
            });
            characterSelectorView.render();
        });
    }

    startGame({ user1Character, user2Character }) {

        this.keyboardListener = new KeyboardListener();
        this.eventBus = new EventBus();

        user1Character.isDirectedRight = true;
        user2Character.isDirectedRight = false;

        const rUser1 = makeReactive({
            model: new User({
                name: user1Character.getDisplayName(),
                character: user1Character.name,
                isComp: false,
                isDirectedRight: true,
                fireImage: user1Character.fireImage
            })
        });

        const user1View = new UserView({
            containerId: 'user1',
            audioManager: new AudioManager({ containerId: 'user1-sound' }),
            reactiveModel: rUser1,
            width: user1Character.width,
            height: user1Character.height,
            xOffset: user1Character.getOffset(),
            pointSize: this.pointSize,
            jumpHeight: this.userJumpHeight,
            jumpStepTime: this.userJumpStepTime,
        });

        const rUser2 = makeReactive({
            model: new User({
                name: user2Character.getDisplayName(),
                character: user2Character.name,
                isComp: false,
                isDirectedRight: false,
                fireImage: user2Character.fireImage
            })
        });

        const user2View = new UserView({
            containerId: 'user2',
            audioManager: new AudioManager({ containerId: 'user2-sound' }),
            reactiveModel: rUser2,
            width: user2Character.width,
            height: user2Character.height,
            xOffset: user2Character.getOffset(),
            pointSize: this.pointSize,
            jumpHeight: this.userJumpHeight,
            jumpStepTime: this.jumpStepTime,
            jumpStepTime: this.userJumpStepTime
        });

        const scoreView = new ScoreView({ containerId: 'score', rUser1, rUser2 });

        const bgImageNumber = 14;
        const randomImageIndx = Math.floor(Math.random() * bgImageNumber);
        const bgImage = `./assets/scenes/${randomImageIndx + 1}.gif`;

        const gameView = new GameView({
            containerId: 'game',
            bgImage,
            width: this.canvasWidth,
            height: this.canvasHeight,
            pointSize: this.pointSize,
            childViews: [
                user1View,
                user2View,
                scoreView
            ]
        });

        gameView.render();

        gameView.subscribeOnInteraction(({ source, target, interactionType }) => {
            switch (interactionType) {
                case INTERACTION_TYPE.Kicked:
                    this.eventBus.dispatchEvent(GAME_EVENTS.Kicked, { source, target });
                    break;
                default:
                    break;
            }
        });

        gameView.subscribeOnMove(({ view }) => {
            console.log('move')
            const userViews = gameView.childViews.filter(v => v instanceof UserView);
            userViews.forEach(userView => {
                if (!userView.model.isJumping && !userView.model.isLanding) {
                    if (userView.parent.canMoveDown({ view: userView })) {
                        commandExecutor.storeAndExecute(
                            new CommandLand({ view: userView })
                        );
                    }
                }
                const otherUserViewPoints = [];
                userView.parent.childViews
                    .filter(item => item instanceof UserView && item !== userView)
                    .forEach(item => {
                        otherUserViewPoints.push(...item.getPoints())
                    })

                const otherUserMinX = Math.min(...otherUserViewPoints.map(item => item.x));
                const ownMinX = Math.min(...userView.points.map(item => item.x));

                if (userView.model.isDirectedRight && ownMinX > otherUserMinX) {
                    userView.reactiveModel.setPropValue('isDirectedRight', false);
                }

                if (!userView.model.isDirectedRight && ownMinX < otherUserMinX) {
                    userView.reactiveModel.setPropValue('isDirectedRight', true);
                }
            });
        });

        const commandExecutor = new CommandExecutor();

        this.keyboardListener.onPressKeys([KEY_CODES.User1MoveRight, KEY_CODES.User2MoveRight], debounce(({ code }) => {
            const view = code === KEY_CODES.User1MoveRight
                ? user1View
                : user2View;
            view.moveRight();
        }, this.debounceMs));

        this.keyboardListener.onPressKeys([KEY_CODES.User1MoveLeft, KEY_CODES.User2MoveLeft], debounce(({ code }) => {
            const view = code === KEY_CODES.User1MoveLeft
                ? user1View
                : user2View;
            view.moveLeft();
        }, this.debounceMs));

        this.keyboardListener.onPressKeys([KEY_CODES.User1Jump, KEY_CODES.User2Jump], debounce(async ({ code }) => {
            const view = code === KEY_CODES.User1Jump
                ? user1View
                : user2View;
            await commandExecutor.storeAndExecute(
                new CommandJump({ view })
            );
            await commandExecutor.storeAndExecute(
                new CommandLand({ view })
            );
        }), this.debounceMs);

        this.keyboardListener.onPressKeys([KEY_CODES.User1Kick, KEY_CODES.User2Kick], debounce(async ({ code }) => {
            const view = code === KEY_CODES.User1Kick
                ? user1View
                : user2View;
            await commandExecutor.storeAndExecute(
                new CommandKick({ view })
            );
        }), this.debounceMs);


        this.keyboardListener.onPressKeys([KEY_CODES.User1Fire, KEY_CODES.User2Fire], debounce(async ({ code }) => {
            const view = code === KEY_CODES.User1Fire
                ? user1View
                : user2View;
            commandExecutor.storeAndExecute(
                new CommandFire({ view, pointSize: this.pointSize, commandExecutor, fireStepTime: this.fireStepTime })
            );
        }), this.debounceMs);


        this.eventBus.onEvent(GAME_EVENTS.Kicked, ({ source, target }) => {
            const nextHealth = target.getPropValue('health') - 1;
            target.setPropValue('health', nextHealth);
            setTimeout(() => {
                if (nextHealth <= 0) {
                    confirm(`${source.getPropValue('name')} won!`);
                    window.location.reload();
                }
            }, 100);
        });

    }
}

const game = new Game({
    canvasWidth: 40,
    userJumpHeight: 10,
    userJumpStepTime: 100,
    fireStepTime: 100,
    debounceMs: 5,
});








