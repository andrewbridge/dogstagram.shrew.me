import * as Phaser from 'phaser';
import GameScene from './GameScene.mjs';

var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: [
        new GameScene({ key: 'game', active: true })
    ]
};

var game = new Phaser.Game(config);
