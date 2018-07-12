/// <reference path="node_modules/@types/node/index.d.ts" />
'use strict'

let VoiceText = require('voicetext');
let Client = require('castv2-client').Client;
let DefaultMediaReceiver = require('castv2-client').DefaultMediaReceiver;
let mdns = require('mdns');

class GoogleHomeNotifier {
  constructor(voiceTextKey) {
    this.voicetext = new VoiceText(voiceTextKey);
    this.setting = {
      speaker: this.voicetext.SPEAKER.HIKARI,
      pitch: 100,
      speed: 100,
      volume: 100
    };
  }

  setDeviceName(name) {
    this.deviceName = name;
    return this;
  }

  setDeviceAddress(address) {
    this.deviceAddress = address;
    return this;
  }

  notify(message, audioFile, audioUrl, callback) {
    if (!this.deviceAddress) {
      let browser = mdns.createBrowser(mdns.tcp('googlecast'));
      browser.start();
      browser.on('serviceUp', function (service) {
        console.log('Device "%s" at %s:%d', service.name, service.addresses[0], service.port);
        if (service.name.includes(this.device.replace(' ', '-'))) {
          this.deviceAddress = service.addresses[0];
          this.getSpeechUrl(message, this.deviceAddress, audioFile, audioUrl, function (res) {
            callback(res);
          });
        }
        browser.stop();
      });
    } else {
      this.getSpeechUrl(message, this.deviceAddress, audioFile, audioUrl, function (res) {
        callback(res);
      });
    }
  };

  getSpeechUrl(text, host, audioFile, audioUrl, callback) {
    this.voicetext
      .speaker(this.setting.speaker)
      .pitch(this.setting.pitch)
      .speed(this.setting.speed)
      .volume(this.setting.volume)
      .speak(text, (e, buf) => {
        const fs = require('fs');
        console.log(audioFile);
        fs.writeFile(audioFile, buf, 'binary', (e) => {
          this.onDeviceUp(host, audioUrl, callback);
        });
      });
  };

  onDeviceUp(host, url, callback) {
    var client = new Client();
    client.connect(host, function () {
      client.launch(DefaultMediaReceiver, function (err, player) {
        var media = {
          contentId: url,
          contentType: 'audio/wav',
          streamType: 'BUFFERED'
        };
        console.log(url);
        player.load(media, { autoplay: true }, function (err, status) {
          client.close();
          console.log(err, status);
          callback('Device notified');
        });
      });
    });

    client.on('error', function (err) {
      console.log('Error: %s', err.message);
      client.close();
      callback('error');
    });
  };

}

module.exports = GoogleHomeNotifier;
