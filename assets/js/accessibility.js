/*!
 * Javascript BaAccessibility
 * Copyright 2010, bestaddon.com
 *
 * Dual licensed under the MIT and GPL licenses
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 */
/* global BaAccessibility,localStorage,getComputedStyle,NodeFilter,Audio,SpeechSynthesisUtterance,responsiveVoice */
; ((win, doc, ba) => {
  const speechSyn = win.speechSynthesis
  const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(navigator.userAgent)
  const on = (el, ev, fn) => el && ev.split(/\s+/).forEach(e => el.addEventListener(e, fn, false))
  const merge = (a, b) => Object.assign(a, b)
  const getStyle = (elem, prop) => (getComputedStyle(elem, null) || elem.currentStyle || elem.style)[prop]
  const isObject = o => o && typeof o === 'object'
  const defaultConfig = (object) => {
    const obj = {}
    let list = []
    for (const key in object) {
      if (Object.hasOwnProperty.call(object, key)) {
        list.push(...Object.keys(object[key]))
      }
    }
    list = [...new Set(list)].filter(el => (el !== 'title' && el !== 'player-ui'))
    list.push('darkmode', 'audio-play', 'audio-rate-slider', 'audio-pitch-slider', 'audio-volume-slider')
    list.forEach(el => { obj[el] = null })
    return obj
  }
  const nodeList = (self, excludes) => {
    const list = { all: [], heading: [], link: [], text: [], textNoHeading: [], bgExist: [] }
    const tw = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT)
    excludes = excludes.split(',').map(e => e.trim() && e.toLowerCase())
    while (tw.nextNode()) {
      const node = tw.currentNode
      if (!self.contains(node) && !excludes.includes(node.nodeName.toLowerCase())) {
        list.all.push(node)
        const isHeading = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(node.nodeName.toLowerCase())
        const isContainsText = [...node.childNodes].some(el => el.nodeType === 3 && el.textContent.trim() !== '')
        if (isHeading) {
          list.heading.push(node)
        }
        if (node.nodeName.toLowerCase() === 'a') {
          list.link.push(node)
        }
        if (isContainsText) {
          list.text.push(node)
        }
        if (isContainsText && !isHeading) {
          list.textNoHeading.push(node)
        }
        if (getStyle(node, 'background') !== 'none') {
          list.bgExist.push(node)
        }
      }
    }
    return list
  }
  const getUserOptions = (name) => {
    let data = localStorage.getItem(name)
    if (data) {
      data = JSON.parse(data)
    }
    return isObject(data) ? data : {}
  }
  const setUserOptions = (name, options) => {
    localStorage.setItem(name, JSON.stringify(options))
  }
  const getUnit = (fontSize = '') => {
    return ['px', 'cm', 'em', 'ex', 'in', 'mm', 'pc', 'pt', 'vh', 'vw', 'vmin']
      .filter(unit => fontSize.match(new RegExp(unit + '$', 'gi'))).pop()
  }

  // MAIN FUNCTION ///////////////
  function Main (options) {
    const defaults = { // set default options
      id: 'ba__acc-1',
      container: null,
      className: 'ba__accessibility',
      width: '25em',
      position: 'right',
      logoUrl: null,
      logoPosition: 'start',
      icons: null,
      css: null,
      isMenuOpened: true,
      hideOnPhone: 0,
      setDarkMode: false,
      readModeSelector: 'main,#main',
      speechLang: null,
      remoteReaderSource: 'google', // google | responsiveVoice

      itemsList: {
        header: {
          title: 'Trợ Năng',
          logo: 'Accessibility toolbar',
          reset: 'Reset All',
          darkmode: 'Dark mode',
          action: 'close'
        },
        body: {
          audio: {
            title: 'Trình đọc màn hình',
            'player-ui': {
              'audio-play': '&nbsp;',
              'audio-rate-slider': {
                label: 'Tốc độ',
                max: 2,
                min: 0.1,
                step: 0.1,
                value: 1
              },
              /* 'audio-pitch-slider': {
                label: 'Pitch',
                max: 2,
                min: 0,
                step: 0.1,
                value: 1
              }, */
              'audio-volume-slider': {
                label: 'Âm lượng',
                max: 1,
                min: 0,
                step: 0.1,
                value: 0.8
              }
            }
          },
          font: {
            title: 'Điều chỉnh nội dung',
            'font-size-slider': {
              label: 'Kích thước chữ',
              max: 5,
              min: 0,
              step: 0.1,
              value: 1
            },
            'line-height-slider': {
              label: 'Chiều cao dòng',
              max: 5,
              min: 0,
              step: 0.1,
              value: 1
            },
            'letter-spacing-slider': {
              label: 'Khoảng cách chữ',
              max: 5,
              min: 0,
              step: 0.1,
              value: 1
            },
            'page-zoom-slider': {
              label: 'Phóng to',
              max: 2,
              min: 0,
              step: 0.1,
              value: 1
            },
            'align-left': 'Canh trái',
            'align-center': 'Canh giữa',
            'align-right': 'Canh phải',
            'highlight-heading': 'Tô sáng tiêu đề',
            'highlight-link': 'Tô sáng liên kết',
            'highlight-hover': 'Tô sáng theo con trỏ',
            'readable-font': 'Font dễ đọc',
            'dyslexia-font': 'Font Khó đọc',
            'text-magnifier': 'Kính lúp'
          },
          blend: {
            title: 'Hiệu ứng pha trộn',
            'blend-invert': 'Đảo ngược',
            'blend-grayscale': 'Đơn sắc',
            'blend-dark-contrast': 'Tương phản tối',
            'blend-light-contrast': 'Tương phản sáng',
            'blend-low-saturation': 'Bão hòa thấp',
            'blend-high-saturation': 'Bão hòa cao'
          },
          other: {
            title: 'Điều chỉnh tối ưu',
            'hide-image': 'Ẩn các ảnh',
            'stop-animation': 'Dừng hoạt cảnh',
            'read-mode': 'Chế độ chỉ đọc',
            'cursor-guide': 'Hướng dẫn đọc',
            'cursor-mask': 'Mặt nạ đọc',
            'cursor-big': 'Con trỏ lớn'
          },
          colour: {
            title: 'Điều chỉnh màu',
            'background-color': {
              label: 'Màu nền',
              value: '#0076B4,#7A549C,#C83733,#D07021,#26999F,#4D7831,#ffffff,#000000'
            },
            'headline-color': {
              label: 'Màu tiêu đề',
              value: '#0076B4,#7A549C,#C83733,#D07021,#26999F,#4D7831,#ffffff,#000000'
            },
            'text-color': {
              label: 'Màu văn bản',
              value: '#0076B4,#7A549C,#C83733,#D07021,#26999F,#4D7831,#ffffff,#000000'
            }
          }
        }
      },
      tagsExcludes: 'script,embed,object'
    }
    const opts = this.settings = merge(defaults, options || {})

    const page = doc.documentElement
    const body = doc.body
    const STOREAGE_NAME = 'BA__ACC_' + opts.id
    const speechLang = opts.speechLang || page.lang || navigator.language
    let buttons = []
    let iconLabel

    const fontIcons = Object.keys(opts.itemsList.body.font).slice(1)
    const blendIcons = Object.keys(opts.itemsList.body.blend).slice(1)
    const status = merge(defaultConfig(opts.itemsList.body), getUserOptions(STOREAGE_NAME))
    const iconName = (word) => Object.keys(status).find(el => el.includes(word))

    const wrapper = doc.createElement('section')
    wrapper.className = opts.className
    const cursor = doc.createElement('i')
    cursor.className = opts.className + '-cursor'
    const tip = doc.createElement('i')
    tip.className = opts.className + '-tip'
    const readModeWrap = doc.createElement('section')
    readModeWrap.className = opts.className + '-readability'

    const colorHtml = (i, item) => '<label>' + item.label + '</label><div class="' + opts.className + '-colour-body" data-rel="' + i + '">' + (item.value.split(',').map(el => '<i class="' + opts.className + '-color-button" data-color="' + el + '" style="background:' + el + '"></i>').join('')) + '</div>'

    const iconHtml = (i, val = null) => (opts.logoUrl && i === 'logo'
      ? '<img src="' + opts.logoUrl + '" alt=""/>'
      : '<svg height="100%" preserveAspectRatio="xMidYMid meet"><use href="#baa-' + i + '" xlink:href="#baa-' + i + '"></use></svg>') +
       (val ? '<i>' + val + '</i>' : '')

    const sliderHtml = (i, item) => '<label>' + item.label + '</label>' +
      '<div class="' + opts.className + '-slider-body" data-range="' + i.replace('-slider', '') + '" data-value="' + item.value + '">' +
      '<i class="' + opts.className + '-range-minus-button">' + iconHtml('minus') + '</i>' +
      '<div><input type="range" min="' + item.min + '" max="' + item.max + '" step="' + item.step + '" value="' + item.value + '" title="' + item.value + '" class="' + opts.className + '-range-input"><i>' + ((item.value) * 100) + '%</i></div>' +
      '<i class="' + opts.className + '-range-plus-button">' + iconHtml('plus') + '</i>' +
      '</div>'

    const layout = (items) => {
      let html = ''
      for (const key in items) {
        if (Object.hasOwnProperty.call(items, key)) {
          const isTitle = key.includes('title')
          const isSlider = key.includes('slider')
          const isColor = key.includes('color')
          const subClassName = (!isObject(items[key]) && !isTitle ? (isSlider ? '' : '-button') : '')
          html += '<div class="' + opts.className + '-' + key + subClassName + '">'
          if (isObject(items[key]) && !isSlider && !isColor) {
            html += layout(items[key])
          } else {
            html += isTitle ? items[key] : (isSlider ? sliderHtml(key, items[key]) : (isColor ? colorHtml(key, items[key]) : iconHtml(key, items[key])))
          }
          html += '</div>'
        }
      }
      return html
    }

    const getNode = nodeList(wrapper, opts.tagsExcludes)

    function textRange (input, cssProperty) {
      getNode.text.forEach(el => {
        let original = el.getAttribute('data-' + opts.className + '-' + cssProperty + '-original')
        if (!original) {
          original = getStyle(el, cssProperty)
          el.setAttribute('data-' + opts.className + '-' + cssProperty + '-original', original)
        }

        if (input && input.closest('[data-range^=' + cssProperty + ']')) {
          const units = getUnit(original) || 'px'
          const fontShow = (parseFloat(original) || 1) * parseFloat(input.value)
          el.style[cssProperty] = input.value !== input.title ? fontShow + units : ''
          input.nextElementSibling.textContent = parseInt(parseFloat(input.value) * 100) + '%'
        }
      })
    }

    const pageZoom = (input) => {
      if ('zoom' in page.style) {
        page.style.zoom = input.value
      } else {
        page.style.transform = 'scale(' + input.value + ')'
        page.style.transformOrigin = 'center top'
        body.scrollLeft = (body.scrollWidth - body.clientWidth) / 2
      }
      input.nextElementSibling.textContent = parseInt(parseFloat(input.value) * 100) + '%'
    }

    // BEGIN SPEECH ////////////////
    const player = new Audio()
    const speechHighlight = opts.className + '-speech-highlight'
    const stopSpeech = () => {
      [...doc.querySelectorAll(speechHighlight)].forEach(el => el.classList.remove(speechHighlight))
      speechSyn.cancel()
      player.pause()
      player.currentTime = 0
    }
    const textReader = (el, langcode = 'en', rate = 1, volume = 0.8, pitch = 1) => {
      const currentVoice = speechSyn.getVoices().find(voice => voice.lang.startsWith(langcode))
      if (currentVoice) {
        const utterThis = new SpeechSynthesisUtterance()
        utterThis.text = el.innerText
        utterThis.voice = currentVoice
        utterThis.lang = currentVoice.lang
        utterThis.pitch = pitch
        utterThis.rate = rate
        utterThis.volume = volume
        utterThis.onend = function (e) {
          setTimeout(() => el.classList.remove(speechHighlight), 500)
        }
        stopSpeech()
        el.classList.add(speechHighlight)
        speechSyn.speak(utterThis)
      } else remoteReader(el, langcode, rate, volume, pitch)
    }
    const audioRemoteReader = new Audio()
    async function remoteReader (el, langcode = 'en', rate = 1, volume = 0.8, pitch = 1) {
      const inputText = el.innerText.replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16)) // Fix for encodeURIComponent
      /* player.src = 'https://www.freetranslations.org/speak.php?word=' + encodeURIComponent(inputText) + '&lang=' + (langcode.split('-')[0])
      player.volume = volume
      player.playbackRate = rate
      player.onpause = function (e) {
        setTimeout(() => el.classList.remove(speechHighlight), 500)
      }
      stopSpeech()
      el.classList.add(speechHighlight)
      player.play() */

      doc.querySelectorAll('.' + speechHighlight).forEach(ele => ele.classList.remove(speechHighlight))
      el.classList.add(speechHighlight)
      if (opts.remoteReaderSource === 'google') {
        const url = 'https://texttospeech.googleapis.com/v1/text:synthesize?key=AIzaSyCWwdtk4H5kHn2ZdsRI0OsPI6SoRn-zJIw'
        const data = {
          input: {
            text: inputText
          },
          voice: {
            languageCode: 'vi-VN',
            name: 'vi-VN-Standard-B',
            ssmlGender: 'MALE'
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: Math.max(0.5, rate)
          }
        }
        const otherparam = {
          headers: {
            'content-type': 'application/json; charset=UTF-8'
          },
          body: JSON.stringify(data),
          method: 'POST'
        }
        const res = await fetch(url, otherparam)
        const resJson = await res.json()
        if (resJson) {
          audioRemoteReader.src = 'data:audio/mpeg;base64,' + resJson.audioContent
          audioRemoteReader.volume = volume
          // audioRemoteReader.defaultPlaybackRate = rate
          audioRemoteReader.play()
          audioRemoteReader.onended = () => el.classList.remove(speechHighlight)
        }
      } else {
        responsiveVoice.cancel()
        responsiveVoice.speak(inputText, 'Vietnamese Male', {
          rate,
          volume,
          onend: () => el.classList.remove(speechHighlight)
        })
      }
    }
    const textReaderEvent = (e) => {
      if (e.target && e.target.innerText && [...e.target.childNodes].some(el => el.nodeType === 3 && el.textContent.trim())) {
        textReader(e.target, speechLang, status[iconName('audio-rate')] || 1, status[iconName('audio-volume')] || 0.8)
      }
    }
    // END SPEECH ////////////////

    const action = (item, isClick = false) => {
      const button = isClick ? item.closest('[class*="-button"]') : wrapper.querySelector('[class*="' + item + '"]')
      const hasText = (word) => button.className.includes(word)
      const groupButtons = (group = [], elements = [], suffix) => {
        group.forEach(icon => {
          if (!hasText(icon)) {
            elements.forEach(el => el.classList.remove(opts.className + '-' + icon + suffix))
            getNode.bgExist.forEach(el => el.classList.remove(opts.className + '-contrast'))
            const siblingButton = buttons.find(el => el.className.includes(icon))
            siblingButton.classList.remove(opts.className + '-active')
            if (isClick) status[iconName(icon)] = false
          } else {
            elements.forEach(el => el.classList.toggle(opts.className + '-' + icon + suffix))
            if (isClick) status[iconName(icon)] = !status[iconName(icon)]
          }
        })
      }
      const groupColors = (icon, cssProperty = 'color', elements = []) => {
        const buttonBody = isClick ? button.parentNode : button.lastElementChild
        const colorName = buttonBody.getAttribute('data-rel')
        if (colorName.includes(icon)) {
          const groupColors = [...buttonBody.children]
          groupColors.forEach(el => {
            const selectColor = el.getAttribute('data-color')
            if (isClick) {
              if (!el.contains(button)) el.classList.remove(opts.className + '-active')
              else status[iconName(colorName)] = selectColor
            } else {
              if (selectColor === status[iconName(colorName)]) el.classList.add(opts.className + '-active')
            }
          })
          if (status[iconName(icon)]) {
            elements.forEach(el => {
              el.style[cssProperty] = status[iconName(colorName)]
              el.style.setProperty('--' + cssProperty, status[iconName(colorName)])
            })
          }
        }
      }

      if (isClick ? button : status[item]) {
        // BEGIN READ-MODE ///////////////////
        if (hasText(iconLabel = 'read-mode')) {
          if (isClick) status[iconName(iconLabel)] = !status[iconName(iconLabel)]
          page.classList[status[iconName(iconLabel)] ? 'add' : 'remove'](opts.className + '-' + iconLabel)
          if (status[iconName(iconLabel)]) {
            readModeWrap.append(...doc.querySelectorAll(opts.readModeSelector));
            [...body.children].forEach(el => !wrapper.contains(el) && el.remove())
            body.prepend(readModeWrap)
          } else {
            if (isClick) window.location.reload()
          }
        }
        // END READ-MODE ///////////////////

        // BEGIN BASIC ACTION ///////////////////
        if (hasText(isClick ? 'range-' : '-slider')) {
          const input = (isClick ? button.parentNode : button).querySelector('input')
          const wrap = input.closest('[data-range]')
          const name = wrap.getAttribute('data-range')
          const defaultValue = wrap.getAttribute('data-value')
          input.value = isClick
            ? (parseFloat(input.value) + (parseFloat(input.step) * (hasText('plus') ? 1 : -1)))
            : status[iconName(name)]
          if (isClick) status[iconName(name)] = input.value
          if (status[iconName(name)] !== defaultValue) wrap.setAttribute('data-enable', 1)
          else wrap.removeAttribute('data-enable')

          if (name.includes('zoom')) pageZoom(input)
          else textRange(input, name)
        }

        ['heading', 'link', 'hover', 'magnifier', 'hide-image', 'stop-animation'].forEach((name, i) => {
          if (hasText(name)) {
            if (i < 3) getNode[name === 'hover' ? 'text' : name].forEach(el => el.classList.toggle(opts.className + '-' + name))
            else page.classList.toggle(opts.className + '-' + name)
            if (isClick) status[iconName(name)] = !status[iconName(name)]
          }
        })

        if (hasText('align')) {
          groupButtons(['left', 'center', 'right'], getNode.text, '-font')
        }
        if (hasText('-font')) {
          groupButtons(['readable', 'dyslexia'], [page], '-font')
        }

        if (hasText('cursor')) {
          groupButtons(['guide', 'mask', 'big'], [page], '-cursor')
          if (isClick) merge(cursor.style, { left: isClick.clientX + 'px', top: isClick.clientY + 'px' })
        }
        // END BASIC ACTION ///////////////////

        // BEGIN SCREEN READER ///////////////////
        if (hasText(iconLabel = 'audio-play')) {
          if (isClick) status[iconName(iconLabel)] = !status[iconName(iconLabel)]
          page.classList[status[iconName(iconLabel)] ? 'add' : 'remove'](opts.className + '-' + iconLabel)
          if (status[iconName(iconLabel)]) {
            doc.addEventListener('click', textReaderEvent, true)
            doc.addEventListener('focus', textReaderEvent, true)
          } else {
            stopSpeech()
            doc.removeEventListener('click', textReaderEvent, true)
            doc.removeEventListener('focus', textReaderEvent, true)
          }
        }
        // END SCREEN READER ///////////////////

        // BEGIN BLEND MODE ///////////////////
        if (hasText('-blend')) {
          groupButtons(blendIcons, [page], '-blend')
          if (hasText('-contrast')) getNode.bgExist.forEach(el => el.classList.toggle(opts.className + '-contrast'))
        }
        // END BLEND MODE ///////////////////

        // BEGIN COLOR MODE ///////////////////
        if (hasText('color')) {
          groupColors('background-color', 'background', [body, ...getNode.bgExist])
          groupColors('text-color', 'color', getNode.textNoHeading)
          groupColors('headline-color', 'color', getNode.heading)
        }
        // END COLOR MODE ///////////////////

        if (!hasText(isClick ? 'range-' : '-slider')) {
          button.classList.toggle(opts.className + '-active')
        }
        if (hasText('action')) {
          wrapper.classList.toggle(opts.className + '-open')
        }
        if (hasText('darkmode')) {
          wrapper.classList.toggle(opts.className + '-darkmode')
          if (isClick) status[iconName('darkmode')] = !status[iconName('darkmode')]
        }
        if (hasText('reset') && isClick) {
          merge(status, defaultConfig(opts.itemsList.body))
          window.location.reload()
        }
      }
    }

    // Main stuff
    this.init = function () {
      if (opts.hideOnPhone) {
        const phoneToggle = () => wrapper.classList[(win.innerWidth || page.clientWidth) <= 575 ? 'add' : 'remove'](opts.className + '-hide')
        win.addEventListener('resize', phoneToggle)
        phoneToggle()
      }

      (opts.container ? (opts.container.charAt ? doc.querySelector(opts.container) : opts.container) : body).append(wrapper)
      page.classList[opts.container ? 'add' : 'remove'](opts.className + '-static')
      page.classList.add(opts.className + '-position-' + opts.position)
      page.classList.add(opts.className + '-iconpos-' + opts.logoPosition)
      if (opts.setDarkMode) {
        wrapper.classList.add(opts.className + '-darkmode')
      }

      wrapper.innerHTML = (opts.css ? '<style>' + opts.css + '</style>' : '') +
        '<div class="' + opts.className + '-action-button">' + iconHtml('logo') + '</div>' +
        '<div class="' + opts.className + '-container">' + layout(opts.itemsList) + '</div>' + (opts.icons || '')
      wrapper.append(cursor, tip)
      buttons = [...wrapper.querySelectorAll('[class*="-button"]')]

      wrapper.style.setProperty('--ba-awidth', opts.width)

      if (opts.isMenuOpened) wrapper.classList.add(opts.className + '-open')

      // SET DEFAULT FONT SLIDER
      fontIcons.slice(0, 3).forEach(el => textRange(null, el.replace('-slider', '')))

      Object.keys(status).forEach(el => action(el))
      on(wrapper, 'click', function (e) {
        action(e.target, e)
        setUserOptions(STOREAGE_NAME, status)
      })

      // Press the @ key to enable or disable the Screen Reader
      on(doc, 'keydown', function (e) {
        if (e.key === '@' || (e.which === 50 && e.shiftKey)) {
          const playButton = doc.querySelector('[class*="audio-play-button"]')
          action(playButton, e)
          setUserOptions(STOREAGE_NAME, status)
        }
      })

      on(doc, 'mousemove', e => {
        if (page.className.includes('-cursor') || page.className.includes('magnifier')) {
          [cursor, tip].forEach(el => merge(el.style, { left: e.clientX + 'px', top: e.clientY + 'px' }))
        }
      })

      on(doc, 'mouseover', function (e) {
        if (page.className.includes('magnifier')) {
          const textNode = getNode.text.includes(e.target)
          tip.textContent = textNode ? e.target.textContent : ''
          tip.style.display = textNode ? 'block' : 'none'
        }
      });

      [...wrapper.querySelectorAll('input[type=range]')].forEach(el => {
        on(el, 'input', function (e) {
          const wrap = this.closest('[data-range]')
          const inputType = wrap.getAttribute('data-range')
          // if (inputType.includes('font-size')) textRange(this, inputType)

          this.nextElementSibling.textContent = parseInt(parseFloat(this.value) * 100) + '%'
          status[iconName(inputType)] = this.value
          setUserOptions(STOREAGE_NAME, status)
        })
      })

      setUserOptions(STOREAGE_NAME, status)
    }

    // Run initializer
    this.init()
  }
  win[ba] = Main
})(window, document, 'TBtronang')
