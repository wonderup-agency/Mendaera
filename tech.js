gsap.registerPlugin(ScrollTrigger)
const mm = gsap.matchMedia()

// ------------------------
// Diagnostics for the product-overview component
// ------------------------
// Off unless asked for, so nothing reaches a normal visitor's console. Turn it
// on with ?mddebug=1 on the URL, or once with localStorage.mdDebug = '1'.
// Built for a phone inspected remotely, where breakpoints are impractical.
const MD_DEBUG = (function () {
  try {
    return /[?&]mddebug=1/.test(location.search) ||
      location.hash === '#mddebug' ||
      localStorage.getItem('mdDebug') === '1'
  } catch (e) { return false }
})()
const MD_T0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
function mdNow() {
  return ((typeof performance !== 'undefined' ? performance.now() : Date.now()) - MD_T0) / 1000
}
function mdlog() {
  if (!MD_DEBUG) return
  const a = Array.prototype.slice.call(arguments)
  a.unshift('[MD ' + mdNow().toFixed(2) + 's]')
  console.log.apply(console, a)
}
// Short label for a video: its Vimeo id and rendition
function mdVid(v) {
  if (!v) return 'null'
  const src = (v.querySelector && v.querySelector('source') && v.querySelector('source').src) || v.currentSrc || ''
  const m = src.match(/playback\/(\d+)\/rendition\/(\w+)/)
  return m ? m[1] + '@' + m[2] : '?'
}
function mdVidState(v) {
  if (!v) return {}
  let buffered = 0
  try { buffered = v.buffered.length ? +v.buffered.end(v.buffered.length - 1).toFixed(2) : 0 } catch (e) {}
  return {
    rs: v.readyState, net: v.networkState, preload: v.preload, paused: v.paused,
    t: +v.currentTime.toFixed(2), dur: Number.isFinite(v.duration) ? +v.duration.toFixed(2) : null,
    buffered, z: v.style.zIndex, display: v.style.display, err: v.error ? v.error.code : null,
  }
}
if (MD_DEBUG) {
  mdlog('debug ON', {
    viewport: innerWidth + 'x' + innerHeight,
    dpr: devicePixelRatio,
    connection: (navigator.connection && navigator.connection.effectiveType) || 'n/a',
    downlinkMbps: (navigator.connection && navigator.connection.downlink) || 'n/a',
    readyState: document.readyState,
  })
  addEventListener('load', function () { mdlog('window load') })
}
window.addEventListener('load', () => {
  ScrollTrigger.refresh()
  setTimeout(() => ScrollTrigger.refresh(), 1500)
})

// Both refreshes above run long before the lazy Lottie in section_target
// renders. Its container measures 0 until the SVG lands and 758 px after, so
// the section grows 540 px and every start below it -- the pinned video's
// included -- is short by that much: the pin fires half a viewport early, the
// title scrolls across the fixed video, and the video lands a second time when
// the pin releases. Nothing in ScrollTrigger watches for content growing on its
// own, so re-measure when the page height changes with the viewport unchanged.
// A viewport change is ScrollTrigger's own resize path (and the address bar on
// mobile), so those are left alone.
;(function refreshOnLateLayoutShift() {
  if (!window.ResizeObserver) return
  const target = document.querySelector('.main-wrapper') || document.body
  if (!target) return

  let height = document.documentElement.scrollHeight
  let vw = window.innerWidth
  let vh = window.innerHeight
  let timer = null

  function check() {
    timer = null
    if (window.innerWidth !== vw || window.innerHeight !== vh) {
      vw = window.innerWidth
      vh = window.innerHeight
      height = document.documentElement.scrollHeight
      return
    }
    if (document.documentElement.scrollHeight === height) return
    mdlog('late layout shift', { from: height, to: document.documentElement.scrollHeight })
    ScrollTrigger.refresh()
    // Read after the refresh so the pin spacers it re-measures are not seen as
    // the next shift, which would loop.
    height = document.documentElement.scrollHeight
  }

  new ResizeObserver(() => {
    clearTimeout(timer)
    timer = setTimeout(check, 200)
  }).observe(target)
})()

document.querySelectorAll('[data-component="home-video"]').forEach((videoComponent) => {
  const wrapper = videoComponent.querySelector('[data-home-video="wrapper"]')
  const video = videoComponent.querySelector('[data-home-video="video"]')
  const playButton = videoComponent.querySelector('[data-home-video="play-button"]')

  const autoplayOnly = videoComponent.dataset.autoplayOnly === 'true'
  const showControls = videoComponent.dataset.controls === 'true'
  const playOnView = videoComponent.dataset.playOnView === 'true'
  const noAnimation = videoComponent.dataset.noAnimation === 'true'
  video.loop = true
  video.muted = true

  if (playOnView) {
    playButton.style.display = 'none'
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play()
          } else {
            video.pause()
          }
        })
      },
      { threshold: 0.5 }
    )
    observer.observe(video)
  } else if (showControls) {
    playButton.style.display = 'flex'
  } else {
    playButton.style.display = 'none'
    video.play()
  }

  function handlePlay() {
    if (showControls) {
      video.muted = false
      video.controls = true
    }
    video.play()
    playButton.style.display = 'none'
  }

  if (!autoplayOnly) {
    const overlayWrapper = videoComponent.querySelector('.vid_overlay-wrapper')
    if (overlayWrapper) overlayWrapper.style.pointerEvents = 'auto'

    wrapper.addEventListener('click', (e) => {
      if (e.target.closest('[data-home-video="play-button"]')) return
      if (video.paused) {
        handlePlay()
      } else {
        video.pause()
        playButton.style.display = 'flex'
      }
    })

    playButton.addEventListener('click', () => {
      handlePlay()
    })
  }

  if (!noAnimation) {
    mm.add('(min-width: 992px)', () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: videoComponent,
          start: 'top top',
          end: '+=100%',
          scrub: true,
          pin: true,
          // recalcula los valores del tween (rem / %) en cada refresh -> resize
          invalidateOnRefresh: true,
        },
      })
      tl.to(wrapper, {
        maxWidth: '87rem',
        height: '95%',
        borderRadius: '0.75rem',
      })
    })
  }
})

const MendaeraCharts = (() => {
  const COLORS = {
    primary: '#26ca99',       // --base-color--teal
    secondary: '#D4D9D8',
    text: '#1c1c1c',          // var(--base-color--soft-black)
    textLight: '#828282',     // var(--base-color--mid-grey)
    grid: '#f1f2f3',          // var(--base-color--super-soft-grey)
    border: '#d4d4d4',        // var(--base-color--light-grey)
    white: '#ffffff',
  }

  const altFamily = getComputedStyle(document.documentElement)
    .getPropertyValue('--_typography---family--alternative').trim()
  const FONT = {
    family: altFamily || "Suisseintl, Arial, sans-serif",
    weight: '500',
  }

  // Every size ramps with the chart width between the two designed ends
  // (350px phone -> 1100px desktop). It used to switch at 400px, so any window
  // in between got the full desktop scale -- 40px values and 18px labels in a
  // 420px canvas, which run into each other and into the neighbouring bars.
  function ramp(chartWidth, min, max) {
    const t = Math.min(Math.max((chartWidth - 350) / 750, 0), 1)
    return min + (max - min) * t
  }

  // Gaps: desktop 3.125rem (50px) between groups, 0.5rem (8px) internal
  //        mobile  1rem (16px) between groups, 0.25rem (4px) internal
  function getSizes(chartWidth, chartHeight, numCategories, numDatasets) {
    // A short chart can't carry the full type scale either: the wrapper is
    // 20rem from the tablet breakpoint down while the width stays wide.
    const shortFactor = Math.min(Math.max((chartHeight || 460) / 460, 0.85), 1)
    const size = (min, max) => Math.round(ramp(chartWidth, min, max) * shortFactor)

    const groupGap = ramp(chartWidth, 16, 50)
    const barGap = ramp(chartWidth, 4, 8)

    // Calculate percentages from pixel gaps
    const catWidth = chartWidth / (numCategories || 4)
    const categoryPercentage = Math.min(Math.max(1 - groupGap / catWidth, 0.4), 0.95)
    const barSlot = (catWidth * categoryPercentage) / (numDatasets || 2)
    const barPercentage = Math.min(Math.max(1 - barGap / barSlot, 0.5), 0.98)

    return {
      labelTop: size(13, 18),
      labelTopSub: size(8, 11),
      value: size(24, 40),
      // Space reserved above the plot area for the category labels.
      // Must fit: label ascender + topGap + a little breathing room.
      topPadding: size(34, 44),
      topGap: size(8, 10),
      valueGap: size(8, 14),
      barRadius: chartWidth < 400 ? 3 : 4,
      barPercentage,
      categoryPercentage,
    }
  }

  const instances = {}

  function comparison(canvasId, config) {
    if (instances[canvasId]) {
      if (instances[canvasId]._sizeObserver) instances[canvasId]._sizeObserver.disconnect()
      instances[canvasId].destroy()
      delete instances[canvasId]
    }

    const canvas = document.getElementById(canvasId)
    if (!canvas) return
    if (typeof Chart === 'undefined') return

    const {
      labels = [],
      datasets = [],
      showPercent = false,
      title = '',
      colors = [COLORS.secondary, COLORS.primary],
      maxValue = null,
    } = config

    Chart.defaults.font.family = FONT.family

    // Get initial sizes
    const container = canvas.parentElement
    const numCat = labels.length
    const numDs = datasets.length
    let s = getSizes(container?.offsetWidth || 600, container?.offsetHeight || 400, numCat, numDs)

    // Metallic green gradient — cached, recreated only on resize
    let _gradCache = null
    let _gradH = 0
    function getPrimaryGradient(ctx, chartArea) {
      const h = chartArea.bottom - chartArea.top
      if (_gradCache && _gradH === h) return _gradCache
      _gradH = h
      const grad = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
      // Bright at bottom → dark at top (clean base)
      grad.addColorStop(0, '#a0f0d8')
      grad.addColorStop(0.2, '#4dddb2')
      grad.addColorStop(0.4, '#26ca99')
      grad.addColorStop(0.6, '#1aad80')
      grad.addColorStop(0.8, '#128c65')
      grad.addColorStop(1, '#0a6b4a')
      return _gradCache = grad
    }

    const primaryIdx = datasets.findIndex((ds, i) => !ds.color && colors[i % colors.length] === COLORS.primary)

    const chartDatasets = datasets.map((ds, i) => ({
      label: ds.label || `Dataset ${i + 1}`,
      data: ds.data,
      backgroundColor: ds.color || colors[i % colors.length],
      borderRadius: s.barRadius,
      borderSkipped: false,
      barPercentage: s.barPercentage,
      categoryPercentage: s.categoryPercentage,
    }))

    let gradientApplied = false

    // Store real data; only zero out the primary (green) dataset for animation
    const realData = chartDatasets.map((ds) => [...ds.data])
    if (primaryIdx !== -1) {
      chartDatasets[primaryIdx].data = chartDatasets[primaryIdx].data.map(() => 0)
    }

    instances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: { labels, datasets: chartDatasets },
      options: {
        layout: {
          padding: { top: s.topPadding, right: 0, left: 0 },
        },
        animation: false,
        // The canvas is sized by applySize() below, not by Chart.js.
        responsive: false,
        maintainAspectRatio: false,
        // Disable all hover/pointer interactions on the bars
        events: [],
        onResize(chart, size) {
          s = getSizes(size.width, size.height, numCat, numDs)
          chart.options.layout.padding.top = s.topPadding
          chart.data.datasets.forEach((ds) => {
            ds.borderRadius = s.barRadius
            ds.barPercentage = s.barPercentage
            ds.categoryPercentage = s.categoryPercentage
          })
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { display: false },
          },
          y: {
            display: false,
            beginAtZero: true,
            max: maxValue || 115,
          },
        },
        plugins: {
          legend: { display: false },
          title: title
            ? {
                display: true,
                text: title,
                align: 'start',
                font: {
                  family: FONT.family,
                  size: 40,
                  weight: FONT.weight,
                },
                color: COLORS.text,
                padding: { bottom: 32 },
              }
            : { display: false },
          tooltip: { enabled: false },
        },
      },
      plugins: [
        // Plugin: category labels at the top of each bar group
        {
          id: 'topLabels',
          // Keep the reserved top padding in sync with the CANVAS size.
          // (`s` is measured from the container, which can differ and leave
          //  too little room → labels drawn above y=0 and clipped.)
          beforeLayout(chart) {
            if (!chart.width || !chart.height) return
            const sz = getSizes(chart.width, chart.height, chart.data.labels.length, chart.data.datasets.length)
            if (chart.options.layout.padding.top !== sz.topPadding) {
              chart.options.layout.padding.top = sz.topPadding
            }
          },
          afterDraw(chart) {
            const { ctx: c, scales: { x }, width, height } = chart
            const sz = getSizes(width, height, chart.data.labels.length, chart.data.datasets.length)
            const topY = chart.chartArea.top

            chart.data.labels.forEach((label, i) => {
              if (!label) return
              c.save()
              c.textAlign = 'left'
              c.textBaseline = 'bottom'
              c.letterSpacing = '0px'

              const match = label.match(/^(.+?)(\s*\(.+\))$/)
              const name = (match ? match[1].trim() : label).toUpperCase()
              const num = match ? match[2].trim().toUpperCase() : ''

              // Measure first so we can keep the label inside the canvas
              c.font = `${FONT.weight} ${sz.labelTop}px ${FONT.family}`
              const nameMetrics = c.measureText(name)
              const nameWidth = nameMetrics.width
              const ascent = nameMetrics.actualBoundingBoxAscent || sz.labelTop * 0.8

              let numWidth = 0
              const numOffset = sz.labelTopSub * 0.4
              if (num) {
                c.font = `${FONT.weight} ${sz.labelTopSub}px ${FONT.family}`
                numWidth = numOffset + c.measureText(num).width
              }

              // Never draw above the top edge of the canvas
              const baselineY = Math.max(topY - sz.topGap, Math.ceil(ascent) + 1)
              // Never overflow the right edge (labels are left-aligned on the group center)
              const xPos = Math.max(0, Math.min(x.getPixelForValue(i), width - nameWidth - numWidth))

              // Name (large, dark)
              c.fillStyle = COLORS.text
              c.font = `${FONT.weight} ${sz.labelTop}px ${FONT.family}`
              c.fillText(name, xPos, baselineY)

              // Number (small, light) on the same line, right after the name
              if (num) {
                c.fillStyle = COLORS.textLight
                c.font = `${FONT.weight} ${sz.labelTopSub}px ${FONT.family}`
                c.fillText(num, xPos + nameWidth + numOffset, baselineY)
              }
              c.restore()
            })
          },
        },
        // Plugin: mantiene el gradiente metalico en sync con la altura del chart.
        // Sin esto, en resize las barras verdes conservan el gradiente creado con
        // las coordenadas viejas (getPrimaryGradient cachea por altura).
        {
          id: 'primaryGradientSync',
          afterLayout(chart) {
            if (!gradientApplied || primaryIdx === -1 || !chart.chartArea) return
            chart.data.datasets[primaryIdx].backgroundColor = getPrimaryGradient(chart.ctx, chart.chartArea)
          },
        },
        // Plugin: draw % labels based on current data values
        ...(showPercent
          ? [
              {
                id: 'barValueLabels',
                afterDatasetsDraw(chart) {
                  const { ctx: c, width, height } = chart
                  const sz = getSizes(width, height, chart.data.labels.length, chart.data.datasets.length)

                  chart.data.datasets.forEach((dataset, di) => {
                    const meta = chart.getDatasetMeta(di)
                    meta.data.forEach((bar, index) => {
                      const val = Math.round(dataset.data[index])
                      if (val <= 0) return

                      c.save()
                      c.fillStyle = COLORS.text
                      c.font = `400 ${sz.value}px Suisseintl, Arial, sans-serif`
                      c.letterSpacing = '0px'
                      c.textAlign = 'center'
                      c.textBaseline = 'bottom'
                      // Clamp: the value never rises past the plot area top,
                      // so it can't overlap the category labels or get clipped
                      const minY = chart.chartArea.top + sz.value * 0.85
                      c.fillText(`${val}%`, bar.x, Math.max(bar.y - sz.valueGap, minY))
                      c.restore()
                    })
                  })
                },
              },
            ]
          : []),
      ],
    })

    const chart = instances[canvasId]

    // Sizing is ours, not Chart.js's. Chart.js takes the height from the parent,
    // but the parent (.chart_item, height auto) takes it from the canvas: with
    // nothing definite in the chain the canvas ends up measuring itself and
    // gains a few px on every resize (633 -> 664 -> ...) until it spills over
    // the section below. Its min-height compounds it -- the wrapper is 320px
    // from the tablet breakpoint down while the floor stays at 480.
    // So: drop the floor, and measure the box with the canvas out of the
    // layout, which is a height the canvas cannot feed back into.
    const box = canvas.closest('.chart_container') || container
    if (container) container.style.minHeight = '0px'
    canvas.style.maxWidth = '100%'

    function availableHeight() {
      const display = canvas.style.display
      canvas.style.display = 'none'
      const h = box.clientHeight
      canvas.style.display = display
      return h
    }

    function applySize() {
      const width = (container || box).clientWidth
      if (!width) return
      // Fallback for the widths where nothing up the chain sets a height.
      const height = availableHeight() || Math.round(Math.min(Math.max(width * 0.6, 280), 480))
      if (Math.round(chart.width) === width && Math.round(chart.height) === height) return
      chart.resize(width, height)
    }

    applySize()

    if (window.ResizeObserver) {
      let sizeTimer = null
      const observer = new ResizeObserver(() => {
        clearTimeout(sizeTimer)
        sizeTimer = setTimeout(applySize, 80)
      })
      observer.observe(box)
      chart._sizeObserver = observer
    }

    // Animate datasets sequentially: grey bars first, then green bars
    const animDuration = 1200
    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4)

    function animateDataset(dsIndex) {
      return new Promise((resolve) => {
        const target = realData[dsIndex]
        const startTime = performance.now()
        function tick(now) {
          const elapsed = now - startTime
          const progress = Math.min(elapsed / animDuration, 1)
          const eased = easeOutQuart(progress)
          chart.data.datasets[dsIndex].data = target.map((v) => v * eased)
          chart.update('none')
          if (progress < 1) requestAnimationFrame(tick)
          else {
            // Apply gradient after green bars finish
            if (dsIndex === primaryIdx && primaryIdx !== -1 && !gradientApplied && chart.chartArea) {
              gradientApplied = true
              chart.data.datasets[primaryIdx].backgroundColor = getPrimaryGradient(chart.ctx, chart.chartArea)
              chart.update('none')
            }
            resolve()
          }
        }
        requestAnimationFrame(tick)
      })
    }

    // Animate only the primary (green) dataset
    function playAnimation() {
      if (primaryIdx !== -1) {
        animateDataset(primaryIdx)
      }
    }

    if (!config.delayAnimation) {
      playAnimation()
    }

    chart.playAnimation = playAnimation
    return chart
  }

  function onScroll(canvasId, config) {
    const container = document.getElementById(canvasId)?.closest('.chart_container')
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            comparison(canvasId, config)
            observer.unobserve(container)
          }
        })
      },
      { threshold: 0.3 }
    )

    observer.observe(container)
  }

  return { comparison, onScroll }
})()

  const wrapper = document.getElementById('chart-wrapper')

  if (wrapper) {
    // Create chart immediately with grey bars visible, green bars at zero
    wrapper.classList.add('is-visible')
    const chart = MendaeraCharts.comparison('comparison-1', {
      labels: ['NOVICE (200)', ' Mid-Tier (80)', 'EXPERT (80)'],
      datasets: [
        { label: 'FREEHAND (180)', data: [14, 27, 40] },
        { label: 'ROBOT (180)',    data: [74, 80, 90] },
      ],
      showPercent: true,
      delayAnimation: true,
    })

    // Animate green bars on scroll
    let chartTriggered = false
    ScrollTrigger.create({
      trigger: wrapper,
      start: 'top center',
      onEnter: () => {
        if (chartTriggered) return
        chartTriggered = true
        if (chart && chart.playAnimation) chart.playAnimation()
      },
    })
  }
  // ------------------------
// Product Modal
// ------------------------
mm.add('(min-width: 992px)', () => {
const _ac = new AbortController()
const _signal = _ac.signal
const modal = document.querySelector('[data-modal="product-features"]')
if (modal) {
  const modalComponent = document.querySelector('[data-component="modal-product"]')
  const cards = modalComponent ? modalComponent.querySelectorAll('[data-modal-tab]') : []
  const tabLinks = modal.querySelectorAll('[data-tab-link]')

  const tabsLinksWrapper = modal.querySelector('.product_modal-tabs-links-wrapper')
  if (tabsLinksWrapper) tabsLinksWrapper.style.position = 'relative'

  const SCROLL_OFFSET = 0
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const tabPanes = modal.querySelectorAll('.product_modal-tabs-pane')
  const paneWrapper = modal.querySelector('.product_modal-tabs-pane-wrapper')

  // ---- Item switching (text + image/video) within active pane ----
  function setActiveItem(pane, index) {
    const textItems = pane.querySelectorAll('.product_modal-tab-text-item')
    const imageItems = pane.querySelectorAll('.product_modal-tab-image-wrapper')
    textItems.forEach((item, i) => item.classList.toggle('is-active', i === index))

    // Ensure visual wrapper is stacking context with overflow hidden
    const visualWrapper = pane.querySelector('.product_modal-tab-visual-wrapper')
    if (visualWrapper) {
      visualWrapper.style.position = 'relative'
      visualWrapper.style.overflow = 'hidden'
    }

    // First pass: immediately hide all non-target items to prevent flash
    imageItems.forEach((item, i) => {
      if (i !== index && !item.classList.contains('is-active')) {
        item.style.display = 'none'
      }
    })

    imageItems.forEach((item, i) => {
      const isActive = i === index
      const wasActive = item.classList.contains('is-active')
      const video = item.querySelector('[data-modal-video="video"]')

      gsap.killTweensOf(item)

      if (isActive && !wasActive) {
        // --- New item reveals on top like a curtain descending ---
        item.classList.add('is-active')
        item.style.cssText = 'display:flex;position:absolute;top:0;left:0;width:100%;height:100%;z-index:2;'
        gsap.fromTo(item,
          { clipPath: 'inset(0 0 100% 0)' },
          {
            clipPath: 'inset(0 0 0% 0)',
            duration: 0.7,
            ease: 'power3.inOut',
            onComplete: () => {
              // Once revealed, become the base layer
              item.style.cssText = 'display:flex;position:relative;z-index:1;'
              gsap.set(item, { clipPath: '' })
              // Now hide the old item underneath
              imageItems.forEach((other, j) => {
                if (j !== i) {
                  other.classList.remove('is-active')
                  other.style.display = 'none'
                  other.style.position = ''
                  other.style.zIndex = ''
                  gsap.set(other, { clipPath: '' })
                  const v = other.querySelector('[data-modal-video="video"]')
                  if (v) { v.pause(); v.style.display = 'none' }
                }
              })
            },
          }
        )
        if (video) {
          video.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;'
          video.currentTime = 0
          video.play().catch(() => {})
        }
      } else if (isActive && wasActive) {
        // --- Already active (first load / tab switch) ---
        // Don't clear clipPath — may be pre-set by setActiveTab for reveal
        item.classList.add('is-active')
        item.style.display = 'flex'
        item.style.position = 'relative'
        item.style.zIndex = '1'
        if (video) {
          video.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;'
          video.currentTime = 0
          video.play().catch(() => {})
        }
      } else if (!isActive && !wasActive) {
        // --- Already hidden, keep hidden ---
        item.classList.remove('is-active')
        item.style.display = 'none'
        item.style.position = ''
        item.style.zIndex = ''
        if (video) { video.pause(); video.style.display = 'none' }
      }
      // wasActive + !isActive: old item stays visible underneath, hidden in onComplete above
    })
  }

  // ---- Auto-advance system (progress bar + GSAP tween) ----
  const IMAGE_SLIDE_DURATION = 5 // seconds for image-only slides
  let _autoAdvanceState = null
  // { pane, barTween, video, onEnded, onMouseEnter, onMouseLeave, hoverTarget }

  function ensureProgressBars(pane) {
    pane.querySelectorAll('.product_modal-tab-text-item').forEach((item) => {
      if (item.querySelector('.tab-progress-bar')) return
      const bar = document.createElement('div')
      bar.className = 'tab-progress-bar'
      const fill = document.createElement('div')
      fill.className = 'tab-progress-bar__fill'
      bar.appendChild(fill)
      item.appendChild(bar)
    })
  }

  function resetAllBars(pane) {
    pane.querySelectorAll('.tab-progress-bar').forEach((bar) => {
      bar.classList.remove('is-active')
      const fill = bar.querySelector('.tab-progress-bar__fill')
      if (fill) gsap.set(fill, { width: '0%' })
    })
  }

  function cleanupAutoAdvanceListeners() {
    if (!_autoAdvanceState) return
    const { video, onEnded, onMouseEnter, onMouseLeave, hoverTarget, barTween } = _autoAdvanceState
    if (barTween) barTween.kill()
    if (video && onEnded) video.removeEventListener('ended', onEnded)
    if (hoverTarget) {
      if (onMouseEnter) hoverTarget.removeEventListener('mouseenter', onMouseEnter)
      if (onMouseLeave) hoverTarget.removeEventListener('mouseleave', onMouseLeave)
    }
  }

  function stopAutoAdvance() {
    if (!_autoAdvanceState) return
    cleanupAutoAdvanceListeners()
    if (_autoAdvanceState.pane) resetAllBars(_autoAdvanceState.pane)
    _autoAdvanceState = null
  }

  // Advance to the next inner item, or next main tab if inner tabs exhausted
  function advanceToNext(pane, currentInnerIndex, textItems) {
    const nextInner = currentInnerIndex + 1
    if (nextInner < textItems.length) {
      // More inner tabs in this pane
      setActiveItem(pane, nextInner)
      startAutoAdvance(pane)
    } else {
      // All inner tabs done — advance to next main tab
      const nextTab = (activeTabIndex + 1) % tabPanes.length
      setActiveTab(nextTab, true)
    }
  }

  function startAutoAdvance(pane) {
    // Clean previous listeners but don't reset bars yet (resetAllBars called inside)
    cleanupAutoAdvanceListeners()
    _autoAdvanceState = null

    ensureProgressBars(pane)

    const textItems = pane.querySelectorAll('.product_modal-tab-text-item')
    const imageItems = pane.querySelectorAll('.product_modal-tab-image-wrapper')
    // Find active index
    let activeIdx = 0
    textItems.forEach((item, i) => { if (item.classList.contains('is-active')) activeIdx = i })

    const wrapper = imageItems[activeIdx]
    if (!wrapper) return

    // Reset all fills and activate the current one
    resetAllBars(pane)
    const bar = textItems[activeIdx]?.querySelector('.tab-progress-bar')
    if (bar) bar.classList.add('is-active')
    const fill = bar?.querySelector('.tab-progress-bar__fill')

    const video = wrapper.querySelector('[data-modal-video="video"]')
    const hasVideo = !!video

    // --- Hover pause (on the visual wrapper area) ---
    const visualWrapper = pane.querySelector('.product_modal-tab-visual-wrapper') || wrapper
    function onMouseEnter() {
      if (hasVideo && video) video.pause()
      if (_autoAdvanceState?.barTween) _autoAdvanceState.barTween.pause()
    }

    function onMouseLeave() {
      if (hasVideo && video) video.play().catch(() => {})
      if (_autoAdvanceState?.barTween) _autoAdvanceState.barTween.resume()
    }

    visualWrapper.addEventListener('mouseenter', onMouseEnter)
    visualWrapper.addEventListener('mouseleave', onMouseLeave)

    if (hasVideo) {
      // --- Video slide ---
      video.loop = false

      function startBarTween() {
        if (!fill || !video.duration) return null
        gsap.set(fill, { width: '0%' })
        return gsap.to(fill, {
          width: '100%',
          duration: video.duration,
          ease: 'none',
        })
      }

      function onEnded() {
        advanceToNext(pane, activeIdx, textItems)
      }

      let barTween = null
      if (video.readyState >= 1 && video.duration) {
        barTween = startBarTween()
      } else {
        video.addEventListener('loadedmetadata', () => {
          if (_autoAdvanceState && _autoAdvanceState.video === video) {
            _autoAdvanceState.barTween = startBarTween()
          }
        }, { once: true })
      }

      video.addEventListener('ended', onEnded)
      _autoAdvanceState = {
        pane, index: activeIdx, video, onEnded, barTween,
        onMouseEnter, onMouseLeave, hoverTarget: visualWrapper,
      }
    } else {
      // --- Image slide (no video) — use fixed timer ---
      gsap.set(fill, { width: '0%' })
      const barTween = gsap.to(fill, {
        width: '100%',
        duration: IMAGE_SLIDE_DURATION,
        ease: 'none',
        onComplete: () => {
          advanceToNext(pane, activeIdx, textItems)
        },
      })

      _autoAdvanceState = {
        pane, index: activeIdx, video: null, onEnded: null, barTween,
        onMouseEnter, onMouseLeave, hoverTarget: visualWrapper,
      }
    }
  }

  // Event delegation — click on text items (works across all panes)
  paneWrapper.addEventListener('click', (e) => {
    const textItem = e.target.closest('.product_modal-tab-text-item')
    if (!textItem) return
    const pane = textItem.closest('.product_modal-tabs-pane')
    const textItems = [...pane.querySelectorAll('.product_modal-tab-text-item')]
    const index = textItems.indexOf(textItem)
    if (index !== -1) {
      setActiveItem(pane, index)
      startAutoAdvance(pane)
    }
  }, { signal: _signal })

  let activeTabIndex = -1
  let tabTransition = null

  // ---- Sliding pill indicator ----
  const tabMenu = tabLinks[0] && tabLinks[0].parentElement
  var pill = null
  var pillResizeObserver = null
  var _pillRaf = null
  if (tabMenu) {
    tabMenu.style.position = 'relative'
    // Si quedo un pill de un ciclo anterior de matchMedia (resize cruzando 992px), se descarta
    const stalePill = tabMenu.querySelector('.tab-pill')
    if (stalePill) stalePill.remove()
    pill = document.createElement('div')
    pill.className = 'tab-pill'
    pill.style.cssText =
      'position:absolute;top:50%;transform:translateY(-50%);left:0;height:calc(100% - 0.5rem);border-radius:0.5rem;' +
      'background:#000;z-index:0;pointer-events:none;'
    tabMenu.insertBefore(pill, tabMenu.firstChild)
    tabLinks.forEach(function (link) {
      link.style.position = 'relative'
      link.style.zIndex = '1'
      // Strip is-active styles — pill handles the visual indicator
      link.classList.remove('is-active')
    })
  }

  function movePill(index, animate) {
    if (!pill || !tabLinks[index]) return
    var target = tabLinks[index]
    var parentRect = tabMenu.getBoundingClientRect()
    var targetRect = target.getBoundingClientRect()
    var props = {
      left: targetRect.left - parentRect.left,
      width: targetRect.width,
    }
    // Update text colors
    tabLinks.forEach(function (link, i) {
      gsap.to(link, {
        color: i === index ? '#fff' : '#000',
        duration: animate ? 0.3 : 0,
      })
    })
    if (animate) {
      gsap.to(pill, {
        ...props,
        duration: 0.6,
        ease: 'power3.inOut',
      })
    } else {
      gsap.set(pill, props)
    }
  }

  // ---- Resize: el pill vive en px (left/width medidos), hay que recalcularlo ----
  function repositionPill() {
    if (!pill || activeTabIndex < 0) return
    gsap.killTweensOf(pill)
    movePill(activeTabIndex, false)
  }

  function schedulePillReposition() {
    if (_pillRaf) cancelAnimationFrame(_pillRaf)
    _pillRaf = requestAnimationFrame(() => {
      _pillRaf = null
      repositionPill()
    })
  }

  if (tabMenu && typeof ResizeObserver !== 'undefined') {
    // cubre resize del window, cambios de layout del menu y carga de fuentes
    pillResizeObserver = new ResizeObserver(schedulePillReposition)
    pillResizeObserver.observe(tabMenu)
    tabLinks.forEach((link) => pillResizeObserver.observe(link))
  }
  window.addEventListener('resize', schedulePillReposition, { signal: _signal })
  window.addEventListener('orientationchange', schedulePillReposition, { signal: _signal })
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      if (pill && pill.isConnected) schedulePillReposition()
    })
  }

  // ---- Pause all videos inside a pane ----
  function pausePaneVideos(pane) {
    pane.querySelectorAll('[data-modal-video="video"]').forEach((v) => v.pause())
  }

  // ---- Tab switching ----
  function setActiveTab(index, animate = false) {
    if (index === activeTabIndex) return
    stopAutoAdvance()
    const prevIndex = activeTabIndex
    activeTabIndex = index

    // Move pill
    movePill(index, animate && prevIndex >= 0)

    // Tab links — no is-active class, pill handles the indicator
    tabLinks.forEach((link) => {
      link.classList.remove('is-active')
    })

    const newPane = tabPanes[index]

    // If no previous pane or not animating, just show instantly
    if (!animate || prevIndex < 0) {
      tabPanes.forEach((pane, i) => {
        if (i !== index) pausePaneVideos(pane)
        pane.classList.toggle('is-active', i === index)
        pane.style.display = i === index ? 'flex' : 'none'
        gsap.set(pane, { opacity: i === index ? 1 : 0 })
      })
      if (newPane) {
        // Reset image wrappers and show first item's video
        const imgs = newPane.querySelectorAll('.product_modal-tab-image-wrapper')
        imgs.forEach((item, i) => {
          gsap.killTweensOf(item)
          item.classList.toggle('is-active', i === 0)
          item.style.cssText = i === 0 ? 'display:flex;position:relative;z-index:1;' : 'display:none;'
          gsap.set(item, { clipPath: '' })
          const v = item.querySelector('[data-modal-video="video"]')
          if (v && i === 0) {
            v.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;'
            v.currentTime = 0
            v.play().catch(() => {})
          } else if (v) {
            v.pause()
            v.style.display = 'none'
          }
        })
        newPane.querySelectorAll('.product_modal-tab-text-item').forEach((t, i) => {
          t.classList.toggle('is-active', i === 0)
        })
        startAutoAdvance(newPane)
      }
      return
    }

    // Kill any running tab transition
    if (tabTransition) tabTransition.kill()

    // Hide ALL panes immediately
    tabPanes.forEach((pane) => {
      pausePaneVideos(pane)
      gsap.killTweensOf(pane)
      pane.classList.remove('is-active')
      pane.style.display = 'none'
      gsap.set(pane, { opacity: 0 })
    })

    // Reset all image wrappers in the new pane before showing it
    const newImageItems = newPane.querySelectorAll('.product_modal-tab-image-wrapper')
    newImageItems.forEach((item, i) => {
      gsap.killTweensOf(item)
      item.classList.toggle('is-active', i === 0)
      item.style.cssText = i === 0 ? 'display:flex;position:relative;z-index:1;' : 'display:none;'
      gsap.set(item, { clipPath: '' })
      const v = item.querySelector('[data-modal-video="video"]')
      if (v) { v.pause(); v.style.display = 'none' }
    })

    // Reset text items too
    newPane.querySelectorAll('.product_modal-tab-text-item').forEach((t, i) => {
      t.classList.toggle('is-active', i === 0)
    })

    // Show new pane with fade
    newPane.classList.add('is-active')
    newPane.style.display = 'flex'

    // Pre-hide first image wrapper for clip-path reveal (CTA pattern)
    const activeImg = newImageItems[0] || null
    if (activeImg) gsap.set(activeImg, { clipPath: 'inset(0 0 100% 0)' })

    tabTransition = gsap.to(newPane, {
      opacity: 1,
      duration: 0.5,
      delay: 0.15,
      ease: 'power2.out',
      onComplete: () => {
        // Start video of first item now
        if (activeImg) {
          const firstVideo = activeImg.querySelector('[data-modal-video="video"]')
          if (firstVideo) {
            firstVideo.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;'
            firstVideo.currentTime = 0
            firstVideo.play().catch(() => {})
          }
          // Reveal image/video with clip-path
          gsap.fromTo(activeImg,
            { clipPath: 'inset(0 0 100% 0)' },
            { clipPath: 'inset(0 0 0% 0)', duration: 0.7, ease: 'power3.inOut',
              onComplete: () => {
                gsap.set(activeImg, { clipPath: '' })
                startAutoAdvance(newPane)
              },
            }
          )
        } else {
          startAutoAdvance(newPane)
        }
      },
    })
  }

  // ---- Lenis — capture the running instance via prototype patch ----
  // Webflow doesn't expose the Lenis instance globally.
  // Since window.Lenis (the class) exists and raf() runs every frame,
  // we intercept it once to grab `this` (the instance).
  let _lenisInstance = null

  if (window.Lenis && !window.lenis) {
    const origRaf = window.Lenis.prototype.raf
    window.Lenis.prototype.raf = function (time) {
      if (!_lenisInstance) {
        _lenisInstance = this
        window.Lenis.prototype.raf = origRaf
      }
      return origRaf.call(this, time)
    }
  }

  function getLenis() {
    if (_lenisInstance) return _lenisInstance
    if (window.lenis) return window.lenis
    if (window.__lenis) return window.__lenis
    if (document.documentElement.lenis) return document.documentElement.lenis
    return null
  }

  // ---- Smooth scroll to inline section (uses Lenis when available) ----
  function scrollToModal() {
    const lenis = getLenis()
    if (lenis && !prefersReducedMotion) {
      lenis.scrollTo(modal, { offset: SCROLL_OFFSET, duration: 1.2 })
    } else {
      modal.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' })
    }
  }

  // ---- Event listeners ----

  // Cards → scroll to inline section + activate matching tab
  // Match by [data-modal-tab] value against [data-tab-link]; fallback to card index
  cards.forEach((card, index) => {
    card.addEventListener('click', () => {
      const value = card.getAttribute('data-modal-tab')
      let targetIndex = -1
      if (value) {
        tabLinks.forEach((link, i) => {
          if (link.getAttribute('data-tab-link') === value) targetIndex = i
        })
      }
      if (targetIndex === -1 && index < tabLinks.length) targetIndex = index
      scrollToModal()
      if (targetIndex !== -1 && targetIndex !== activeTabIndex) {
        setActiveTab(targetIndex, !prefersReducedMotion)
      }
    }, { signal: _signal })
  })

  tabLinks.forEach((link, index) => {
    link.addEventListener('click', () => setActiveTab(index, !prefersReducedMotion), { signal: _signal })
  })

  // Initialize first tab active on load (no animation) — content is inline
  setActiveTab(0, false)
}

return () => {
  _ac.abort()
  if (typeof stopAutoAdvance === 'function') stopAutoAdvance()
  // declarados con `var` dentro del if (modal) -> visibles aca por hoisting
  if (typeof _pillRaf !== 'undefined' && _pillRaf) cancelAnimationFrame(_pillRaf)
  if (typeof pillResizeObserver !== 'undefined' && pillResizeObserver) pillResizeObserver.disconnect()
  if (typeof pill !== 'undefined' && pill) pill.remove()
}
})

// ------------------------
// Teal active state on the mobile accordion items
// ------------------------
// Mobile has no progress bar (that one is desktop only), so the item itself
// is the only cue that its video is the one currently playing.
// Injected as a stylesheet rather than inline styles so it never fights GSAP.
;(function injectActiveItemStyle() {
  if (document.getElementById('md-tab-active-style')) return
  const style = document.createElement('style')
  style.id = 'md-tab-active-style'
  style.textContent = [
    '@media (max-width: 991px) {',
    '  .product-overview_card-tablet .product_modal-tab-text-item {',
    '    transition: background-color 0.3s ease;',
    '  }',
    '  .product-overview_card-tablet .product_modal-tab-text-item.is-active {',
    '    background-color: #2de7b0;',
    '  }',
    '}',
  ].join('\n')
  document.head.appendChild(style)
})()

mm.add('(max-width: 991px)', () => {
  const _ac = new AbortController()
  const _signal = _ac.signal

  // ---- Section fade-up: disabled on mobile ----
  // The site-wide footer animates [data-animate], leaving the content at
  // opacity 0 until its ScrollTrigger fires. On mobile this section is exactly
  // what people scroll down for, and it read as empty for too long. That
  // script runs before this file (inline #30 vs tech.js #31), so the triggers
  // already exist by now. The divider lines are left alone: no data-animate.
  // Note: killing them is not reverted when resizing up to desktop. Content
  // stays visible, only the entrance animation is lost for that session.
  function killOverviewFade(when) {
    const overviewSection = document.querySelector('.section_product-overview')
    if (!overviewSection || typeof ScrollTrigger === 'undefined') {
      mdlog('fade-kill (' + when + '): nothing to do. section?', !!overviewSection,
        '| ScrollTrigger?', typeof ScrollTrigger)
      return
    }
    let killed = 0
    overviewSection.querySelectorAll('[data-animate]').forEach((el) => {
      ScrollTrigger.getAll().forEach((t) => { if (t.trigger === el) { t.kill(); killed++ } })
      // fade-up animates the element itself; stagger animates its children
      const stagger = el.getAttribute('data-animate') === 'stagger'
      const targets = stagger ? [...el.children] : el
      const probe = stagger && el.children[0] ? el.children[0] : el
      const before = getComputedStyle(probe).opacity
      gsap.killTweensOf(targets)
      // Written out rather than cleared: clearProps would fall back to
      // whatever start state the footer left behind
      gsap.set(targets, { opacity: 1, y: 0 })
      mdlog('fade-kill (' + when + '):', el.getAttribute('data-animate'),
        String(el.className).slice(0, 38), '| triggers killed:', killed,
        '| opacity', before, '->', getComputedStyle(probe).opacity)
    })
    mdlog('fade-kill (' + when + '): total killed', killed, '| still alive in the section:',
      ScrollTrigger.getAll().filter((t) => t.trigger && overviewSection.contains(t.trigger))
        .map((t) => String(t.trigger.className).slice(0, 28)))
  }

  // The first call is the one that does the work: the site-wide footer block
  // that creates these triggers runs before this file, so they already exist
  // (measured: 3 killed, opacity 0 -> 1). The repeats are insurance for the day
  // Webflow's code ordering changes -- if that block ever ended up below this
  // file, a single early call would kill nothing and the section would read as
  // empty until deep scroll. Measured on a 390x844 viewport with the kill
  // missing: the cards only reached opacity 1 once the section top was 84 px
  // from the top of the viewport. Every call is idempotent, so repeating is free.
  killOverviewFade('immediately')
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => killOverviewFade('DOMContentLoaded'),
      { once: true, signal: _signal })
  }
  addEventListener('load', () => killOverviewFade('load'), { once: true, signal: _signal })

  // Tablet / Mobile: accordion dropdown on product cards
  const allCards = document.querySelectorAll('[data-modal-tab]')
  const modal = document.querySelector('[data-modal="product-features"]')
  const modalPanes = modal ? modal.querySelectorAll('.product_modal-tabs-pane') : []
  let openCard = null

  // Build a video data map from the modal panes (source of truth)
  // videoDataMap[cardIndex] = [{ src, poster }, ...] per text item (index 0 = first item)
  const videoDataMap = {}
  modalPanes.forEach((pane, paneIndex) => {
    const wrappers = pane.querySelectorAll('.product_modal-tab-image-wrapper')
    const items = []
    wrappers.forEach((wrapper) => {
      const video = wrapper.querySelector('[data-modal-video="video"]')
      if (video) {
        const source = video.querySelector('source')
        items.push({
          src: source ? source.getAttribute('src') : null,
          poster: video.getAttribute('poster') || '',
        })
      } else {
        items.push(null)
      }
    })
    videoDataMap[paneIndex] = items
  })
  mdlog('discovery: cards', allCards.length, '| modal?', !!modal, '| panes', modalPanes.length,
    '| videos per pane:', Object.keys(videoDataMap).map((k) =>
      k + ':[' + videoDataMap[k].map((it) => {
        if (!it || !it.src) return 'NO-SRC'
        const m = it.src.match(/playback\/(\d+)\/rendition\/(\w+)/)
        return m ? m[1] + '@' + m[2] : 'unrecognised'
      }).join(' ') + ']').join('  '))

  // Track dynamically created videos per card so we can clean them up
  const cardVideos = new Map()
  // cardIndex -> last requested item, to discard reveals that arrive late
  const currentItem = new Map()

  // Initial state: dropdowns hidden, content clipped, images stacked for crossfade
  allCards.forEach((card) => {
    const dropdown = card.querySelector('.product-overview_card-tablet')
    if (!dropdown) return
    gsap.set(dropdown, { height: 0, overflow: 'hidden' })

    // Pre-clip all text items and CTA so they never flash unclipped
    const textItems = dropdown.querySelectorAll('.product_modal-tab-text-item')
    textItems.forEach((t) => gsap.set(t, { clipPath: 'inset(0 100% 0 0)' }))
    const cta = card.querySelector('.product-overview_card-tablet .product_modal-cta')
    if (cta) gsap.set(cta, { clipPath: 'inset(0 0 100% 0)' })

    // Stack images: wrapper = relative, non-main = absolute overlay
    const imageWrapper = card.querySelector('.product-overview_card-image-wrapper')
    if (imageWrapper) imageWrapper.style.position = 'relative'

    const images = card.querySelectorAll('.product-overview_card-image')
    images.forEach((img) => {
      if (!img.classList.contains('is-main')) {
        gsap.set(img, {
          display: 'block',
          opacity: 0,
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        })
      }
    })
  })

  // Create or retrieve a video element for a card at a given text-item index
  function getOrCreateVideo(card, cardIndex, itemIndex) {
    const key = `${cardIndex}-${itemIndex}`
    let existing = cardVideos.get(key)
    if (existing) return existing

    const videoData = videoDataMap[cardIndex]
    if (!videoData || !videoData[itemIndex] || !videoData[itemIndex].src) return null

    const { src, poster } = videoData[itemIndex]
    const video = document.createElement('video')
    video.setAttribute('playsinline', '')
    video.muted = true
    // iOS Safari looks at the attribute, not just the property, before it lets
    // a dynamically created video play inline without a gesture
    video.setAttribute('muted', '')
    video.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:none;z-index:2;'
    const source = document.createElement('source')
    source.src = src
    source.type = 'video/mp4'
    video.appendChild(source)
    // The element paints its poster attribute only while readyState is below
    // HAVE_CURRENT_DATA, and play() clears the show-poster flag straight away.
    // On an empty buffer that leaves the box transparent, and since every
    // ancestor is transparent too, the card image underneath shows through
    // until the first frame decodes. Painting a placeholder as the element's
    // own background closes that gap for good, at the same crop as
    // object-fit: cover. Same fix the Home video cards use.
    //
    // The placeholder is the card's own cover image, not the modal poster: they
    // are two different photos (`handheld-robot.avif` vs `thumb.avif`), so
    // handing over to the poster put a third picture on screen and the sequence
    // read as cover image, flash, video. With the cover image as the
    // placeholder the hand-off is invisible and the only visible change is the
    // video actually starting.
    const cardImage = card.querySelector('.product-overview_card-image')
    const paintPlaceholder = (url) => {
      video.style.backgroundImage = `url("${url}")`
      video.style.backgroundSize = 'cover'
      video.style.backgroundPosition = 'center'
      video.style.backgroundRepeat = 'no-repeat'
    }
    // currentSrc is the exact file already in the HTTP cache, so this costs no
    // request. It is empty until the image loads, hence the fallback and the
    // one-shot listener below.
    const placeholder = (cardImage && cardImage.currentSrc) || poster
    if (placeholder) {
      video.poster = placeholder
      paintPlaceholder(placeholder)
    }
    if (cardImage && !cardImage.currentSrc) {
      cardImage.addEventListener('load', () => {
        if (video.isConnected && cardImage.currentSrc) paintPlaceholder(cardImage.currentSrc)
      }, { once: true })
    }

    // Append inside the image wrapper of this card
    const imageWrapper = card.querySelector('.product-overview_card-image-wrapper')
    if (imageWrapper) imageWrapper.appendChild(video)

    cardVideos.set(key, video)
    mdlog('video created', key, mdVid(video), '| poster?', !!poster)
    if (MD_DEBUG) {
      const label = key + ' ' + mdVid(video)
      ;['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'playing', 'pause',
        'waiting', 'stalled', 'suspend', 'ended', 'error'].forEach((ev) => {
        video.addEventListener(ev, () => mdlog('  video ' + label + ' -> ' + ev, mdVidState(video)))
      })
    }
    return video
  }

  // Destroy all dynamic videos for a card
  function destroyCardVideos(cardIndex) {
    for (const [key, video] of cardVideos) {
      if (key.startsWith(`${cardIndex}-`)) {
        video.pause()
        video.remove()
        cardVideos.delete(key)
        warmed.delete(key)
        if (warming === key) warming = null
      }
    }
  }

  // Videos already told to fetch. Keeping the playing one in here matters:
  // load() on it would restart playback from zero.
  const warmed = new Set()

  // Warm the open card's videos, one at a time. This used to hang off the
  // playing video's 'canplaythrough' and only ever warmed the *next* item, so
  // item 3 did not start downloading until item 2 could play through. Tap item
  // 3 directly and it began from zero, with the previous frame frozen on
  // screen for seconds. Serialized on purpose: two files at once starve the
  // one that is playing.
  const WARM_BUFFER_AHEAD = 4 // seconds of headroom before prefetching a sibling

  // Seconds already buffered past the playhead, 0 if the playhead sits in no
  // buffered range
  function bufferAhead(v) {
    try {
      for (let i = 0; i < v.buffered.length; i++) {
        if (v.buffered.start(i) <= v.currentTime && v.currentTime <= v.buffered.end(i)) {
          return v.buffered.end(i) - v.currentTime
        }
      }
    } catch (e) {}
    return 0
  }

  // Key of the sibling currently downloading, or null. Without it the chain
  // was not actually serial: warmNextVideo hangs off both 'playing' and
  // 'canplaythrough' of the visible video, so two events warmed two siblings at
  // once and the one on screen was starved. Traced on card 2 at 1.6 Mbps: both
  // siblings reached readyState 3 by t=6 s while the playing video sat at
  // currentTime 1.9 s for five seconds straight, playing but frozen.
  let warming = null

  function warmNextVideo(card, cardIndex) {
    if (openCard !== card || !isCardVisible(card)) return
    if (warming) return

    // Only prefetch with real headroom. readyState 3 just means "enough to keep
    // going for now", and gating on that still let a sibling's download starve
    // the video on screen: traced at 1.6 Mbps, currentTime sat at 1.9 s for
    // five seconds while playing. Seconds buffered ahead is self-tuning -- on a
    // fast link the buffer builds and prefetching starts, on a link no quicker
    // than the video's own bitrate it never does, which is right either way.
    const showing = cardVideos.get(`${cardIndex}-${currentItem.get(cardIndex)}`)
    if (showing && showing.readyState < 4 && bufferAhead(showing) < WARM_BUFFER_AHEAD) {
      mdlog('warm: holding off, only', bufferAhead(showing).toFixed(1) + 's buffered ahead',
        mdVidState(showing))
      return
    }

    const count = (videoDataMap[cardIndex] || []).length
    for (let i = 0; i < count; i++) {
      const key = `${cardIndex}-${i}`
      if (warmed.has(key)) continue
      warmed.add(key)
      const v = getOrCreateVideo(card, cardIndex, i)
      if (!v) continue
      warming = key
      const done = () => {
        v.removeEventListener('canplaythrough', done)
        v.removeEventListener('error', done)
        if (warming === key) warming = null
        warmNextVideo(card, cardIndex)
      }
      // The head snippet's observer sets preload="none" in a microtask after
      // insertion; this rAF runs after it, so it wins
      requestAnimationFrame(() => {
        if (!v.isConnected) return (warming === key) && (warming = null)
        v.preload = 'auto'
        try { v.load() } catch (e) {}
        mdlog('warming', key, mdVid(v))
      })
      v.addEventListener('canplaythrough', done)
      v.addEventListener('error', done)
      return
    }
  }

  // ---- Auto-advance: the open card's items play back to back, on a loop ----
  // Mobile counterpart of desktop's startAutoAdvance(): when the current
  // item's video ends it moves to the next, and wraps back to the first.
  //
  // Watch out for the perf snippet in the <head>: it forces preload="none" on
  // every <video> entering the DOM, these JS-created ones included. That is
  // why the chain only runs while the card is on screen — otherwise the first
  // video starts its multi-MB download during page load and drags it 4 s down.
  const ITEM_FALLBACK_DURATION = 5 // seconds, for items with no video
  const METADATA_TIMEOUT = 8 // seconds: advance anyway if duration never lands
  let _cardAuto = null

  // Cards currently on screen. The chain pauses when the card leaves the
  // viewport: without this the loop keeps pulling MB down unseen, forever.
  const visibleCards = new Set()
  const cardObserver = typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) visibleCards.add(e.target)
          else visibleCards.delete(e.target)
          mdlog('visibility: card', [...allCards].indexOf(e.target) + 1,
            e.isIntersecting ? 'ON screen' : 'OFF screen', '| open one?', openCard === e.target)
          if (openCard !== e.target) return
          if (e.isIntersecting) resumeCardAutoAdvance()
          else pauseCardAutoAdvance()
        })
      }, { threshold: 0.01 })
    : null
  if (cardObserver) allCards.forEach((c) => cardObserver.observe(c))

  // With no IntersectionObserver, fall back to the old behavior (just play)
  function isCardVisible(card) {
    return !cardObserver || visibleCards.has(card)
  }

  // Tapping a card used to leave you looking at the wrong place: the card that
  // was open collapses, everything below it jumps up (measured 262-277 px on a
  // 390x844 viewport) and the visual area of the card you just opened lands
  // above the fold. Playback is gated on visibility, so that also meant the
  // chain never started and the card sat there dead. Desktop already scrolls
  // to the section on click; this is the mobile counterpart.
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const CARD_SCROLL_OFFSET = 16 // px of air above the card header

  function scrollCardIntoView(card) {
    const top = Math.max(0, card.getBoundingClientRect().top + window.scrollY - CARD_SCROLL_OFFSET)
    const lenis = window.lenis || window.__lenis || document.documentElement.lenis
    if (lenis && !prefersReducedMotion) lenis.scrollTo(top, { duration: 0.8 })
    else window.scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
  }

  function stopCardAutoAdvance() {
    if (!_cardAuto) return
    const { video, listeners, timer } = _cardAuto
    if (timer) clearTimeout(timer)
    if (video && listeners) listeners.forEach(([ev, fn]) => video.removeEventListener(ev, fn))
    _cardAuto = null
  }

  // Card off screen: stop the video and the timer, but keep the chain around
  // so it can resume on the same item when the card comes back
  function pauseCardAutoAdvance() {
    if (!_cardAuto) return
    if (_cardAuto.timer) { clearTimeout(_cardAuto.timer); _cardAuto.timer = null }
    if (_cardAuto.video) _cardAuto.video.pause()
  }

  function resumeCardAutoAdvance() {
    if (!_cardAuto) return
    if (_cardAuto.video) {
      _cardAuto.video.preload = 'auto'
      _cardAuto.video.play().catch(() => {})
    }
    if (_cardAuto.arm) _cardAuto.arm()
  }

  function startCardAutoAdvance(card, cardIndex, index) {
    stopCardAutoAdvance()

    const dropdown = card.querySelector('.product-overview_card-tablet')
    if (!dropdown) return
    // Desktop (videoDataMap) drives the chain length, not the text items: add
    // a 4th video to the modal and mobile plays it too, untouched
    const videoCount = (videoDataMap[cardIndex] || []).length
    const total = Math.max(dropdown.querySelectorAll('.product_modal-tab-text-item').length, videoCount)
    if (total < 2) return

    // Loop: after the last item it wraps back to 0
    const nextIndex = (index + 1) % total
    function advance() {
      // The card may have closed (or another opened) while the timer ran
      if (openCard !== card) return stopCardAutoAdvance()
      mdlog('advance: card', cardIndex + 1, 'item', index + 1, '->', nextIndex + 1)
      setCardItem(card, cardIndex, nextIndex)
    }

    // Warming starts once the current video can play through, so it never
    // competes for bandwidth with the one on screen
    function preloadNext() {
      warmNextVideo(card, cardIndex)
    }

    const video = cardVideos.get(`${cardIndex}-${index}`)
    if (!video) {
      // Item with no video (image fallback): fixed timer, same as desktop
      const state = { card, index, video: null, timer: null }
      state.arm = () => {
        if (state.timer) { clearTimeout(state.timer); state.timer = null }
        // Off screen the observer re-arms this on the way back in
        if (!isCardVisible(card)) return
        state.timer = setTimeout(advance, ITEM_FALLBACK_DURATION * 1000)
      }
      _cardAuto = state
      if (isCardVisible(card)) state.arm()
      return
    }

    video.loop = false // the loop belongs to the chain, not to one video

    const state = { card, index, video, timer: null }
    // Safety net in case 'ended' never fires (stall, codec, backgrounded tab):
    // armed only once the real duration is known, so it never cuts one short.
    state.arm = function armSafetyTimer() {
      if (state.timer) { clearTimeout(state.timer); state.timer = null }
      // Off screen this stays disarmed: 'loadedmetadata' lands while the card
      // is away (the video keeps buffering) and used to re-arm the timer, so
      // the chain walked to the next item unseen, pulling one file after
      // another. The observer arms it again when the card comes back.
      if (!isCardVisible(card)) return
      const d = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null
      // No metadata yet: retry after METADATA_TIMEOUT
      const secs = d ? d - video.currentTime + 2 : METADATA_TIMEOUT
      const startedAt = video.currentTime
      state.timer = setTimeout(() => {
        // A file whose bitrate is above the visitor's connection cannot play in
        // real time, so 'ended' never arrives and this timer used to skip the
        // item while it was still buffering -- nobody ever saw it. Measured on
        // a 1.6 Mbps link: the 1080p items sit at 4.2 and 3.8 Mbps and got
        // dropped around t=0.9 s of 6.1 s. While playback is still creeping
        // forward, give it another window instead of moving on.
        const creeping = !video.paused && video.currentTime > startedAt + 0.1
        if (creeping && (state.waits = (state.waits || 0) + 1) <= 3) {
          mdlog('safety timer: still buffering, extension', state.waits, 'of 3',
            mdVid(video), mdVidState(video))
          return state.arm()
        }
        mdlog('safety timer fired -> advancing away from item', index + 1,
          mdVid(video), mdVidState(video))
        advance()
      }, secs * 1000)
    }

    const onMeta = () => { if (_cardAuto === state) state.arm() }
    state.listeners = [
      ['ended', advance],
      ['error', advance],
      ['loadedmetadata', onMeta],
      // 'playing' is the moment the viewer sees motion: from here on the
      // bandwidth is free to warm the siblings. 'canplaythrough' stays as the
      // backstop for a video that was already buffered and never fires
      // 'playing' again.
      ['playing', preloadNext],
      ['canplaythrough', preloadNext],
    ]
    state.listeners.forEach(([ev, fn]) => video.addEventListener(ev, fn))

    _cardAuto = state
    // Nothing is armed off screen: the observer does it when the card enters
    if (isCardVisible(card)) state.arm()
  }

  // Activate an item: active text + visual + restart the chain from there
  function setCardItem(card, cardIndex, index) {
    mdlog('setCardItem: card', cardIndex + 1, 'item', index + 1)
    const dropdown = card.querySelector('.product-overview_card-tablet')
    const textItems = dropdown ? dropdown.querySelectorAll('.product_modal-tab-text-item') : []
    // With more videos than text items, the highlight stays on the last one
    const activeText = Math.min(index, textItems.length - 1)
    textItems.forEach((t, i) => t.classList.toggle('is-active', i === activeText))
    switchCardImage(card, cardIndex, index)
    startCardAutoAdvance(card, cardIndex, index)
  }

  // `animate: false` collapses in place, no tweens. Used when another card is
  // being opened: the layout has to settle in this same frame so the scroll
  // target below is the final one, otherwise the card drifts 270 px while the
  // collapse animates and you end up somewhere else again.
  function closeCard(card, animate = true) {
    const dropdown = card.querySelector('.product-overview_card-tablet')
    const icon = card.querySelector('.icon_plus')
    if (!dropdown) return

    // Fast toggles: the open tweens have to die before these start. Both
    // animate `height` on the same dropdown and GSAP defaults to
    // overwrite: false, so whichever finishes last used to win — reopening
    // mid-close left the card collapsed, showing the image and no video.
    killCardTweens(card, dropdown)

    // Stop the chain before destroying the videos it listens to
    if (_cardAuto && _cardAuto.card === card) stopCardAutoAdvance()

    // Pause and destroy dynamic videos
    const cardIndex = [...allCards].indexOf(card)
    // Invalidate any pending reveal before the videos are destroyed
    currentItem.delete(cardIndex)
    destroyCardVideos(cardIndex)

    // Also pause any static videos that might exist in the HTML
    card.querySelectorAll('[data-modal-video="video"]').forEach((v) => {
      v.pause()
      v.style.display = 'none'
    })

    const cta = card.querySelector('.product-overview_card-tablet .product_modal-cta')
    const textItems = dropdown.querySelectorAll('.product_modal-tab-text-item')

    if (!animate) {
      gsap.set(dropdown, { height: 0, overflow: 'hidden' })
      gsap.set(textItems, { clipPath: 'inset(0 100% 0 0)' })
      if (cta) gsap.set(cta, { clipPath: 'inset(0 0 100% 0)' })
      if (icon) gsap.set(icon, { rotation: 0 })
      textItems.forEach((t, i) => t.classList.toggle('is-active', i === 0))
      card.querySelectorAll('.product-overview_card-image').forEach((img) => {
        gsap.killTweensOf(img)
        gsap.set(img, { opacity: img.classList.contains('is-main') ? 1 : 0 })
      })
      return
    }

    // 1. Text items clip out right → left (reverse stagger)
    gsap.to(textItems, {
      clipPath: 'inset(0 100% 0 0)',
      duration: 0.4,
      stagger: { each: 0.06, from: 'end' },
      ease: 'power3.inOut',
    })

    const itemsDelay = textItems.length * 0.06

    // 2. CTA clips back down (bottom edge rises)
    if (cta) {
      gsap.to(cta, {
        clipPath: 'inset(0 0 100% 0)',
        duration: 0.5,
        ease: 'power3.inOut',
        delay: itemsDelay * 0.5,
      })
    }

    // 3. Dropdown collapses after content is hidden
    gsap.to(dropdown, {
      height: 0,
      duration: 0.6,
      ease: 'power3.inOut',
      delay: itemsDelay + 0.15,
      onComplete: () => {
        gsap.set(dropdown, { overflow: 'hidden' })
      },
    })
    if (icon) gsap.to(icon, { rotation: 0, duration: 0.4, ease: 'power3.inOut' })

    // Reset to first item + main image. killTweensOf first: with a fade to 0
    // still running, the two tweens fought over opacity and the image could
    // end up stuck dark after closing.
    textItems.forEach((t, i) => t.classList.toggle('is-active', i === 0))
    const images = card.querySelectorAll('.product-overview_card-image')
    images.forEach((img) => {
      gsap.killTweensOf(img)
      gsap.to(img, { opacity: img.classList.contains('is-main') ? 1 : 0, duration: 0.4 })
    })
  }

  // Every target both open and close animate. Killing them on each toggle is
  // what keeps a fast tap from leaving two tweens fighting over the same prop.
  function killCardTweens(card, dropdown) {
    gsap.killTweensOf(dropdown)
    gsap.killTweensOf(dropdown.querySelectorAll('.product_modal-tab-text-item'))
    const cta = dropdown.querySelector('.product_modal-cta')
    if (cta) gsap.killTweensOf(cta)
    const icon = card.querySelector('.icon_plus')
    if (icon) gsap.killTweensOf(icon)
  }

  function openCardDropdown(card, cardIndex, animate = true) {
    const dropdown = card.querySelector('.product-overview_card-tablet')
    const icon = card.querySelector('.icon_plus')
    if (!dropdown) return

    killCardTweens(card, dropdown)

    // Set first item active, prepare stagger entrance
    const textItems = dropdown.querySelectorAll('.product_modal-tab-text-item')
    textItems.forEach((t, i) => {
      t.classList.toggle('is-active', i === 0)
      gsap.set(t, { clipPath: 'inset(0 100% 0 0)' })
    })
    const cta = card.querySelector('.product-overview_card-tablet .product_modal-cta')
    if (cta) gsap.set(cta, { clipPath: 'inset(0 0 100% 0)' })

    // Instant open (initial state on load): no animation, no scroll jump
    if (!animate) {
      gsap.set(dropdown, { height: 'auto', overflow: 'visible', visibility: 'visible' })
      gsap.set(textItems, { clipPath: 'inset(0 0% 0 0)' })
      if (cta) gsap.set(cta, { clipPath: 'inset(0% 0 0 0)' })
      if (icon) gsap.set(icon, { rotation: 45 })
      setCardItem(card, cardIndex, 0)
      return
    }

    // Measure height without flashing content
    gsap.set(dropdown, { height: 'auto', visibility: 'hidden' })
    const h = dropdown.scrollHeight
    // Set explicitly and not left to the close tween's onComplete: killing that
    // tween mid-flight skips it, and the content spilled during the open
    gsap.set(dropdown, { visibility: 'visible', overflow: 'hidden' })
    gsap.fromTo(dropdown,
      { height: 0 },
      {
        height: h,
        duration: 0.5,
        ease: 'power3.out',
        onComplete: () => {
          gsap.set(dropdown, { height: 'auto', overflow: 'visible' })
          // CTA reveals bottom → top AFTER dropdown is fully expanded
          if (cta) {
            gsap.fromTo(cta,
              { clipPath: 'inset(100% 0 0 0)' },
              { clipPath: 'inset(0% 0 0 0)', duration: 0.5, ease: 'power3.inOut' }
            )
          }
        },
      }
    )

    // Staggered clip reveal left → right for text items
    gsap.to(textItems, {
      clipPath: 'inset(0 0% 0 0)',
      duration: 0.65,
      stagger: 0.1,
      ease: 'power3.out',
      delay: 0.12,
    })

    if (icon) gsap.to(icon, { rotation: 45, duration: 0.35, ease: 'power2.out' })

    // Starts on item 0 and walks the rest on its own
    setCardItem(card, cardIndex, 0)
  }

  // Image/video crossfade: index 0 → is-main image, index N → video from modal
  function switchCardImage(card, cardIndex, index) {
    const images = card.querySelectorAll('.product-overview_card-image')

    // Item requested for this card: the deferred reveal below reads it to
    // bail out if another item was picked while the video was still loading
    currentItem.set(cardIndex, index)

    // Dynamic videos of this card (the incoming one excluded)
    const ownVideos = []
    for (const [key, v] of cardVideos) {
      if (key.startsWith(`${cardIndex}-`)) ownVideos.push(v)
    }

    // Also pause any static HTML videos
    card.querySelectorAll('[data-modal-video="video"]').forEach((v) => {
      v.pause()
      v.style.display = 'none'
    })

    // Try to show video for the selected item
    const video = getOrCreateVideo(card, cardIndex, index)
    mdlog('switch: card', cardIndex + 1, 'item', index + 1, '| video?', mdVid(video),
      '| card on screen?', isCardVisible(card))
    const mdSwitchAt = mdNow()
    if (video) {
      // The outgoing visual stays on screen until the new video has frames. A
      // frameless <video> is transparent and the poster can lag behind (it
      // queues up behind the video itself), so hiding the image any earlier
      // leaves the area blank: measured 2-6 s with preload="none" and 1080p.
      // The outgoing one is frozen but left visible: covering it is worse
      ownVideos.forEach((v) => { if (v !== video) v.pause() })
      video.style.zIndex = '3' // above the outgoing visual while it loads
      video.style.display = 'block'
      video.currentTime = 0
      // Marked before the visibility check on purpose. This is the item being
      // shown, so the warm chain must never call load() on it -- that resets a
      // playing video to zero. On the initial auto-open the observer has not
      // reported yet, so isCardVisible is still false and the mark was being
      // skipped: measured on reload, the video started at 519 ms and the warm
      // chain reset it at 1533 ms, pushing first frame out to 3765 ms.
      warmed.add(`${cardIndex}-${index}`)
      // Only plays (= only downloads) while the card is on screen
      if (isCardVisible(card)) {
        video.preload = 'auto'
        video.play().catch(() => {})
        // disarm() in the head snippet is not idempotent for these: it sets
        // preload="none" and returns before marking mdDisarmed, because they
        // carry no autoplay attribute. Its observer fires in a microtask right
        // after insertion and undoes the line above. Chrome keeps fetching
        // since play() already began, but Safari drops the pending load and
        // the element then sits with no data until something calls play()
        // again -- which reads as having to tap a second time. This rAF runs
        // after that microtask, so it is the last word.
        requestAnimationFrame(() => {
          if (!video.isConnected || currentItem.get(cardIndex) !== index) return
          video.preload = 'auto'
          if (video.paused) video.play().catch(() => {})
        })
      }

      // Polled instead of listening for a single event: the `currentTime = 0`
      // above starts a seek that drops readyState below 2, and 'loadeddata'
      // never fires a second time on an already-loaded video, so waiting for
      // it left every video stacked and visible at once.
      let waited = 0
      const revealWhenReady = () => {
        // Arrived late: another item was requested, or the card closed and
        // its videos were destroyed
        if (currentItem.get(cardIndex) !== index || !video.isConnected) return
        if (video.readyState < 2) {
          // Only on-screen time counts against the budget. Off screen the
          // video is paused, so readyState is frozen and the timeout used to
          // run out while nobody was looking: the reveal gave up for good and
          // the card came back showing the image with the video playing
          // invisibly behind it.
          if (isCardVisible(card) && (waited += 100) > 20000) {
            mdlog('GAVE UP revealing card', cardIndex + 1, 'item', index + 1,
              mdVid(video), 'after 20s', mdVidState(video))
            return
          }
          setTimeout(revealWhenReady, 100)
          return
        }
        mdlog('REVEALED card', cardIndex + 1, 'item', index + 1, mdVid(video),
          'after', (mdNow() - mdSwitchAt).toFixed(2) + 's', mdVidState(video))
        video.style.zIndex = '2'
        ownVideos.forEach((v) => {
          if (v === video) return
          v.pause()
          v.style.display = 'none'
          v.style.zIndex = '2'
        })
        images.forEach((img) => {
          gsap.killTweensOf(img)
          gsap.to(img, { opacity: 0, duration: 0.3, ease: 'power2.inOut' })
        })
      }

      revealWhenReady()
    } else {
      // No video for this item: turn the videos off, the image takes over
      ownVideos.forEach((v) => {
        v.pause()
        v.style.display = 'none'
        v.style.zIndex = '2'
      })
      // No video — fall back to image crossfade
      images.forEach((img) => {
        gsap.killTweensOf(img)
        const show = index === 0
          ? img.classList.contains('is-main')
          : img.classList.contains(`is-${index + 1}`)
        gsap.to(img, { opacity: show ? 1 : 0, duration: 0.4, ease: 'power2.inOut' })
      })
    }
  }

  allCards.forEach((card, cardIndex) => {
    const cardTop = card.querySelector('.product-overview_card-top')
    const dropdown = card.querySelector('.product-overview_card-tablet')
    if (!cardTop || !dropdown) return

    // Accordion toggle
    cardTop.addEventListener('click', () => {
      if (openCard === card) {
        mdlog('TAP card', cardIndex + 1, '-> closing it')
        closeCard(card)
        openCard = null
      } else {
        mdlog('TAP card', cardIndex + 1, '-> opening it | previously open:',
          openCard ? [...allCards].indexOf(openCard) + 1 : 'none',
          '| on screen?', isCardVisible(card))
        // Instant, so the card below is already at its final offset
        if (openCard) closeCard(openCard, false)
        // Marked visible up front: the observer only reports asynchronously,
        // so at this instant the set can still be empty and a deliberate tap
        // would open a card that never plays. The scroll below makes it true,
        // and the observer corrects it either way.
        visibleCards.add(card)
        openCard = card
        openCardDropdown(card, cardIndex)
        scrollCardIntoView(card)
      }
    }, { signal: _signal })

    // Text item tap → switch image/video (first item keeps main image)
    const textItems = dropdown.querySelectorAll('.product_modal-tab-text-item')
    textItems.forEach((item, index) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation()
        // A manual tap restarts the chain from the chosen item
        setCardItem(card, cardIndex, index)
      }, { signal: _signal })
    })
  })

  // First card starts open (no animation on load)
  const firstCard = allCards[0]
  if (firstCard && firstCard.querySelector('.product-overview_card-tablet')) {
    openCardDropdown(firstCard, 0, false)
    openCard = firstCard
  }

  // Tells the <head> snippet the accordion took over. That snippet paints the
  // collapsed state before this file arrives -- otherwise the first paint shows
  // all three cards expanded with no active item, for around 370 ms on a
  // throttled mobile connection -- and it drops the class if this flag never
  // shows up, so a failed or blocked script can never leave the cards shut.
  window.__mdAccordionReady = true
  mdlog('accordion ready | open card 1 | cards', allCards.length)

  return () => {
    _ac.abort()
    stopCardAutoAdvance()
    if (cardObserver) cardObserver.disconnect()
    visibleCards.clear()
    currentItem.clear()
    warmed.clear()
    warming = null
    openCard = null
    // Destroy all dynamic videos
    for (const [, video] of cardVideos) {
      video.pause()
      video.remove()
    }
    cardVideos.clear()
    // Reset: se borran los estilos inline (alturas en px, clip-paths, stacking de
    // imagenes) para que al pasar a desktop manden el CSS y el otro contexto
    allCards.forEach((card) => {
      const dropdown = card.querySelector('.product-overview_card-tablet')
      if (dropdown) {
        gsap.killTweensOf(dropdown)
        gsap.set(dropdown, { clearProps: 'height,overflow,visibility' })
        dropdown.querySelectorAll('.product_modal-tab-text-item').forEach((t) => {
          gsap.killTweensOf(t)
          gsap.set(t, { clearProps: 'clipPath' })
        })
      }
      const cta = card.querySelector('.product-overview_card-tablet .product_modal-cta')
      if (cta) {
        gsap.killTweensOf(cta)
        gsap.set(cta, { clearProps: 'clipPath' })
      }
      const imageWrapper = card.querySelector('.product-overview_card-image-wrapper')
      if (imageWrapper) imageWrapper.style.position = ''
      card.querySelectorAll('.product-overview_card-image').forEach((img) => {
        gsap.killTweensOf(img)
        gsap.set(img, { clearProps: 'opacity,display,position,top,left,width,height,objectFit' })
      })
      const icon = card.querySelector('.icon_plus')
      if (icon) {
        gsap.killTweensOf(icon)
        gsap.set(icon, { clearProps: 'rotation,transform' })
      }
    })
  }
})

// ------------------------
// Number
// ------------------------

// Number Counter with GSAP + ScrollTrigger
// Supports multiple data-component="counter" per page
// Data attributes:
// data-component="counter" → wrapper that enables the script
// data-counter="value"     → target number (e.g., 5000)
// data-counter-duration    → duration in seconds (optional, default: 2)
// data-counter-suffix      → suffix like "+" or "%" (optional)
// data-counter-prefix      → prefix like "$" (optional)

document.addEventListener("DOMContentLoaded", () => {
  const components = document.querySelectorAll('[data-component="counter"]');
  if (!components.length) return;

  components.forEach((component) => {
    const triggerEl = component.querySelector(".our-story_stats") || component;
    const counters = component.querySelectorAll("[data-counter]");

    // Set initial text with prefix/suffix and hide
    counters.forEach((el) => {
      const suffix = el.getAttribute("data-counter-suffix") || "";
      const prefix = el.getAttribute("data-counter-prefix") || "";
      const target = parseFloat(el.getAttribute("data-counter")) || 0;
      const hasDecimals = target % 1 !== 0;
      el.textContent = `${prefix}${hasDecimals ? "0.0" : "0"}${suffix}`;
    });
    gsap.set(counters, { opacity: 0, y: 12 });

    counters.forEach((el, index) => {
      const target = parseFloat(el.getAttribute("data-counter")) || 0;
      const duration = parseFloat(el.getAttribute("data-counter-duration")) || 2;
      const suffix = el.getAttribute("data-counter-suffix") || "";
      const prefix = el.getAttribute("data-counter-prefix") || "";
      const hasDecimals = target % 1 !== 0;
      const staggerDelay = index * 0.15;

      // Fade in
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        delay: staggerDelay,
        ease: "power2.out",
        scrollTrigger: {
          trigger: triggerEl,
          start: "top 40%",
          toggleActions: "play none none none",
        },
      });

      // Count up
      const obj = { val: 0 };
      gsap.to(obj, {
        val: target,
        duration: duration,
        ease: "power2.out",
        delay: staggerDelay,
        scrollTrigger: {
          trigger: triggerEl,
          start: "top 50%",
          toggleActions: "play none none none",
        },
        onUpdate: () => {
          const formatted = hasDecimals
            ? obj.val.toFixed(1)
            : Math.round(obj.val).toLocaleString("en-US");
          el.textContent = `${prefix}${formatted}${suffix}`;
        },
      });
    });
  });

  // Team list staggered fade-in
  const teamItems = document.querySelectorAll(".team_item");
  if (teamItems.length) {
    gsap.set(teamItems, { opacity: 0, scale: 0.8 });

    gsap.to(teamItems, {
      opacity: 1,
      scale: 1,
      duration: 0.8,
      stagger: 0.15,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ".team_list",
        start: "top 80%",
        toggleActions: "play none none none",
      },
    });
  }
});

// ------------------------
// Reference Link Toggle
// ------------------------
document.querySelectorAll('.reference_link').forEach((link) => {
  const quotes = link.closest('.chart_reference-wrapper')?.querySelector('.chart_quotes')
    || link.parentElement?.querySelector('.chart_quotes')
    || document.querySelector('.chart_quotes');
  if (!quotes) return;

  // Start closed
  gsap.set(quotes, { height: 0, overflow: 'hidden', opacity: 0 });

  let isOpen = false;

  link.addEventListener('click', () => {
    const icons = link.querySelectorAll('.reference_link-icon-inner');
    icons.forEach((icon) => icon.classList.toggle('is-active'));

    if (!isOpen) {
      isOpen = true;
      gsap.set(quotes, { height: 'auto' });
      const fullHeight = quotes.scrollHeight;
      gsap.fromTo(quotes,
        { height: 0, opacity: 0 },
        { height: fullHeight, opacity: 1, duration: 0.4, ease: 'power2.out',
          onComplete: () => gsap.set(quotes, { height: 'auto', overflow: 'visible' })
        }
      );
    } else {
      isOpen = false;
      gsap.to(quotes, {
        height: 0, opacity: 0, duration: 0.35, ease: 'power2.in',
        onComplete: () => gsap.set(quotes, { overflow: 'hidden' })
      });
    }
  });
});

// ------------------------
// Target Grid — Entrance Animation
// ------------------------
;(function () {
  const list = document.querySelector('.target_list-item')
  if (!list) return
  const items = list.querySelectorAll('.target_item')
  if (items.length < 9) return

  // Desktop: Spiral entrance (3x3 grid)
  mm.add('(min-width: 992px)', () => {
    const spiralOrder = [0, 1, 2, 5, 8, 7, 6, 3, 4]

    spiralOrder.forEach((domIndex) => {
      if (domIndex === 0) return
      gsap.set(items[domIndex], { opacity: 0, scale: 0.85 })
      const tag = items[domIndex].querySelector('.target_tag')
      if (tag) gsap.set(tag, { clipPath: 'inset(0 100% 0 0)' })
    })

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: list,
        start: 'top 50%',
        toggleActions: 'play none none none',
      },
    })

    spiralOrder.forEach((domIndex, i) => {
      if (domIndex === 0) return
      const tag = items[domIndex].querySelector('.target_tag')
      const offset = i * 0.2

      tl.to(items[domIndex], {
        opacity: 1,
        scale: 1,
        duration: 0.6,
        ease: 'power2.out',
      }, offset)

      if (tag) {
        tl.to(tag, {
          clipPath: 'inset(0 0% 0 0)',
          duration: 0.5,
          ease: 'power3.out',
        }, offset + 0.45)
      }
    })

    return () => {
      tl.kill()
      items.forEach((item) => {
        gsap.set(item, { opacity: 1, scale: 1 })
        const tag = item.querySelector('.target_tag')
        if (tag) gsap.set(tag, { clipPath: 'inset(0 0% 0 0)' })
      })
    }
  })

  // Tablet / Mobile / Landscape: Row-by-row pairs (2-column grid)
  mm.add('(max-width: 991px)', () => {
    // Sequential order, pairs per row: [0,1], [2,3], [4,5], [6,7], [8]
    for (let i = 1; i < items.length; i++) {
      gsap.set(items[i], { opacity: 0, scale: 0.85 })
      const tag = items[i].querySelector('.target_tag')
      if (tag) gsap.set(tag, { clipPath: 'inset(0 100% 0 0)' })
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: list,
        start: 'top 60%',
        toggleActions: 'play none none none',
      },
    })

    for (let i = 1; i < items.length; i++) {
      const tag = items[i].querySelector('.target_tag')
      // Items in the same row (pair) share the same offset
      const row = Math.floor(i / 2)
      const offset = row * 0.2

      tl.to(items[i], {
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: 'power2.out',
      }, offset)

      if (tag) {
        tl.to(tag, {
          clipPath: 'inset(0 0% 0 0)',
          duration: 0.45,
          ease: 'power3.out',
        }, offset + 0.35)
      }
    }

    return () => {
      tl.kill()
      items.forEach((item) => {
        gsap.set(item, { opacity: 1, scale: 1 })
        const tag = item.querySelector('.target_tag')
        if (tag) gsap.set(tag, { clipPath: 'inset(0 0% 0 0)' })
      })
    }
  })
})()