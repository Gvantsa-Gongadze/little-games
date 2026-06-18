import { Howl, Howler } from 'howler'

type SfxKey = 'jump' | 'hit' | 'score' | 'gameOver'
type MusicKey = 'menu' | 'game'

const SFX_SRC: Record<SfxKey, string> = {
  jump:     '/sounds/sfx/jump.wav',
  hit:      '/sounds/sfx/hit.wav',
  score:    '/sounds/sfx/score.wav',
  gameOver: '/sounds/sfx/game-over.wav',
}

const MUSIC_SRC: Record<MusicKey, string> = {
  menu: '/sounds/music/menu.mp3',
  game: '/sounds/music/game.mp3',
}

class SoundManagerClass {
  private sfx: Partial<Record<SfxKey, Howl>> = {}
  private music: Partial<Record<MusicKey, Howl>> = {}
  private currentMusic: MusicKey | null = null
  private _muted = false

  preloadSfx(keys: SfxKey[]) {
    for (const key of keys) {
      if (!this.sfx[key]) {
        this.sfx[key] = new Howl({ src: [SFX_SRC[key]], preload: true })
      }
    }
  }

  playSfx(key: SfxKey) {
    if (!this.sfx[key]) {
      this.sfx[key] = new Howl({ src: [SFX_SRC[key]] })
    }
    this.sfx[key]!.play()
  }

  playMusic(key: MusicKey, volume = 0.4) {
    if (this.currentMusic === key) return
    this.stopMusic()

    if (!this.music[key]) {
      this.music[key] = new Howl({
        src: [MUSIC_SRC[key]],
        loop: true,
        volume,
      })
    }

    this.music[key]!.play()
    this.currentMusic = key
  }

  stopMusic() {
    if (this.currentMusic) {
      this.music[this.currentMusic]?.stop()
      this.currentMusic = null
    }
  }

  get muted() {
    return this._muted
  }

  toggleMute() {
    this._muted = !this._muted
    Howler.mute(this._muted)
    return this._muted
  }

  setVolume(v: number) {
    Howler.volume(v)
  }
}

export const SoundManager = new SoundManagerClass()
