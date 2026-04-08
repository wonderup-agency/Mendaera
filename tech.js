gsap.registerPlugin(ScrollTrigger)
const mm = gsap.matchMedia()
window.addEventListener('load', () => {
  ScrollTrigger.refresh()
  setTimeout(() => ScrollTrigger.refresh(), 1500)
})
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

  // Responsive sizes based on chart width + height
  // Gaps: desktop 3.125rem (50px) between groups, 0.5rem (8px) internal
  //        mobile  1rem (16px) between groups, 0.25rem (4px) internal
  function getSizes(chartWidth, chartHeight, numCategories, numDatasets) {
    const isMobile = chartWidth < 400
    const isLandscape = chartHeight > 0 && chartWidth / chartHeight > 1.4 && chartHeight < 500

    // Desired pixel gaps
    let groupGap, barGap
    if (isMobile) {
      groupGap = 16
      barGap = 4
    } else if (isLandscape) {
      groupGap = 30
      barGap = 6
    } else {
      groupGap = 50  // 3.125rem
      barGap = 8     // 0.5rem
    }

    // Calculate percentages from pixel gaps
    const catWidth = chartWidth / (numCategories || 4)
    const categoryPercentage = Math.min(Math.max(1 - groupGap / catWidth, 0.4), 0.95)
    const barSlot = (catWidth * categoryPercentage) / (numDatasets || 2)
    const barPercentage = Math.min(Math.max(1 - barGap / barSlot, 0.5), 0.98)

    return {
      labelTop: isMobile ? 13 : isLandscape ? 14 : 18,
      labelTopSub: isMobile ? 8 : isLandscape ? 9 : 11,
      value: isMobile ? 24 : isLandscape ? 30 : 40,
      legend: isMobile ? 10 : isLandscape ? 11 : 13,
      topPadding: isMobile ? 28 : isLandscape ? 30 : 34,
      topLineGap: isMobile ? 10 : isLandscape ? 10 : 12,
      valueGap: isMobile ? 8 : isLandscape ? 10 : 14,
      barRadius: isMobile ? 3 : 4,
      barPercentage,
      categoryPercentage,
      legendPadding: isMobile ? 14 : isLandscape ? 16 : 24,
    }
  }

  const instances = {}

  function comparison(canvasId, config) {
    if (instances[canvasId]) {
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
    Chart.defaults.responsive = true
    Chart.defaults.maintainAspectRatio = false

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
          tooltip: {
            backgroundColor: COLORS.text,
            padding: 10,
            cornerRadius: 4,
            titleFont: { family: FONT.family, weight: FONT.weight },
            bodyFont: { family: FONT.family },
            callbacks: {
              label: (ctx) => {
                const suffix = showPercent ? '%' : ''
                return ` ${ctx.dataset.label}: ${ctx.parsed.y}${suffix}`
              },
            },
          },
        },
      },
      plugins: [
        // Plugin: category labels at the top of each bar group
        {
          id: 'topLabels',
          afterDraw(chart) {
            const { ctx: c, scales: { x }, width, height } = chart
            const sz = getSizes(width, height, chart.data.labels.length, chart.data.datasets.length)
            const topY = chart.chartArea.top

            chart.data.labels.forEach((label, i) => {
              if (!label) return
              const xPos = x.getPixelForValue(i)
              c.save()
              c.fillStyle = COLORS.textLight
              c.textAlign = 'left'
              c.textBaseline = 'bottom'

              c.letterSpacing = '0px'

              const match = label.match(/^(.+?)(\s*\(.+\))$/)
              if (match) {
                c.fillStyle = COLORS.text
                c.font = `${FONT.weight} ${sz.labelTop}px ${FONT.family}`
                c.fillText(match[1].toUpperCase(), xPos, topY - sz.topLineGap)
                c.fillStyle = COLORS.textLight
                c.font = `${FONT.weight} ${sz.labelTopSub}px ${FONT.family}`
                c.fillText(match[2].trim().toUpperCase(), xPos, topY - 1)
              } else {
                c.fillStyle = COLORS.text
                c.font = `${FONT.weight} ${sz.labelTop}px ${FONT.family}`
                c.fillText(label.toUpperCase(), xPos, topY - 6)
              }
              c.restore()
            })
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
                      c.fillText(`${val}%`, bar.x, bar.y - sz.valueGap)
                      c.restore()
                    })
                  })
                },
              },
            ]
          : []),
      ],
    })

    // Animate datasets sequentially: grey bars first, then green bars
    const chart = instances[canvasId]
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
      labels: ['NOVICE', 'EXPERIENCED', 'EXPERT'],
      datasets: [
        { label: 'FREEHAND', data: [14, 27, 40] },
        { label: 'ROBOT',    data: [74, 80, 90] },
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
const modalComponent = document.querySelector('[data-component="modal-product"]')
if (modalComponent) {
  const modal = document.querySelector('[data-modal="product-features"]')
  const cards = modalComponent.querySelectorAll('[data-modal-tab]')
  const tabLinks = modal.querySelectorAll('[data-tab-link]')
  const closeBtns = document.querySelectorAll('[data-modal-close="product-features"]')

  let isOpen = false
  let isAnimating = false

  // Tell Lenis to ignore scroll events from inside the modal
  modal.setAttribute('data-lenis-prevent', '')

  // Remove Finsweet scroll-disable attrs — we handle scroll lock ourselves
  // Finsweet overwrites overflow:hidden/auto on html/body and conflicts with our lock
  modal.removeAttribute('fs-scrolldisable-element')
  cards.forEach(card => card.removeAttribute('fs-scrolldisable-element'))
  closeBtns.forEach(btn => btn.removeAttribute('fs-scrolldisable-element'))
  // Also remove from backdrop if it has one
  const backdrop = modal.querySelector('.product_modal-bg')
  if (backdrop) backdrop.removeAttribute('fs-scrolldisable-element')

  // Initial state — hidden, positioned for animation
  gsap.set(modal, {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 10000,
    display: 'none',
    flexDirection: 'column',
    clipPath: 'inset(0 0 100% 0)',
  })
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''

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
        // Don't clear clipPath — may be pre-set by openModal or setActiveTab for reveal
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
  if (tabMenu) {
    tabMenu.style.position = 'relative'
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
          // Reveal image/video with clip-path (same as openModal)
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

  // ---- Close button icon (target inner element, e.g. SVG) ----
  const closeIconWrapper = modal.querySelector('.modal_button-icon')
  const closeIcon = closeIconWrapper && closeIconWrapper.firstElementChild

  // ---- CTA element ----
  const modalCta = modal.querySelector('.product_modal-cta')
  if (modalCta) gsap.set(modalCta, { clipPath: 'inset(100% 0 0 0)' })

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

  // ---- Scroll lock ----
  // Uses CAPTURE PHASE so events are intercepted BEFORE Lenis sees them.
  // stopPropagation prevents the event from reaching Lenis's handler entirely.
  const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'PageUp', 'PageDown', 'Home', 'End'])

  function blockWheel(e) {
    if (paneWrapper && paneWrapper.contains(e.target)) return
    e.preventDefault()
    e.stopPropagation()
  }
  function blockTouch(e) {
    if (paneWrapper && paneWrapper.contains(e.target)) return
    e.preventDefault()
    e.stopPropagation()
  }
  function blockKeys(e) {
    if (!SCROLL_KEYS.has(e.key)) return
    if (paneWrapper && paneWrapper.contains(e.target)) return
    e.preventDefault()
  }

  let _savedPaddingRight = ''

  function lockScroll() {
    const lenis = getLenis()
    if (lenis) lenis.stop()

    // Measure scrollbar width BEFORE hiding overflow
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth
    _savedPaddingRight = document.body.style.paddingRight
    if (scrollbarW > 0) {
      const currentPadding = parseInt(getComputedStyle(document.body).paddingRight, 10) || 0
      document.body.style.paddingRight = (currentPadding + scrollbarW) + 'px'
    }

    document.documentElement.style.setProperty('overflow', 'hidden', 'important')
    document.body.style.setProperty('overflow', 'hidden', 'important')
    document.addEventListener('wheel', blockWheel, { passive: false, capture: true })
    document.addEventListener('touchmove', blockTouch, { passive: false, capture: true })
    document.addEventListener('keydown', blockKeys, { capture: true })
  }

  function unlockScroll() {
    document.removeEventListener('wheel', blockWheel, { capture: true })
    document.removeEventListener('touchmove', blockTouch, { capture: true })
    document.removeEventListener('keydown', blockKeys, { capture: true })
    const lenis = getLenis()
    if (lenis) lenis.start()

    requestAnimationFrame(() => {
      document.body.style.paddingRight = _savedPaddingRight
      document.documentElement.style.removeProperty('overflow')
      document.body.style.removeProperty('overflow')
    })
  }

  // ---- Open modal ----
  function openModal(tabIndex) {
    if (isOpen || isAnimating) return
    isAnimating = true

    modal.setAttribute('data-modal-state', 'open')
    lockScroll()
    ScrollTrigger.getAll().forEach(st => st.disable(false))

    gsap.set(modal, { display: 'flex' })
    // Reset tab index so setActiveTab runs fresh
    activeTabIndex = -1
    setActiveTab(tabIndex)

    // Reveal the active image wrapper with clip-path (same pattern as CTA)
    const activePane = tabPanes[tabIndex]
    if (activePane) {
      const activeImageWrapper = activePane.querySelector('.product_modal-tab-image-wrapper.is-active')
      if (activeImageWrapper) {
        gsap.fromTo(activeImageWrapper,
          { clipPath: 'inset(0 0 100% 0)' },
          { clipPath: 'inset(0 0 0% 0)', duration: 0.7, ease: 'power3.inOut', delay: 0.35,
            onComplete: () => gsap.set(activeImageWrapper, { clipPath: '' }) }
        )
      }
    }
    // Position pill after modal is visible and layout is calculated
    requestAnimationFrame(function () {
      movePill(tabIndex, false)
    })

    // Rotate close icon to X
    if (closeIcon) {
      gsap.fromTo(closeIcon, { rotation: 0 }, {
        rotation: 45,
        duration: 0.5,
        ease: 'power2.out',
        delay: 0.3,
      })
    }

    // Reveal CTA from bottom to top (inverse of modal)
    if (modalCta) {
      gsap.fromTo(modalCta,
        { clipPath: 'inset(100% 0 0 0)' },
        { clipPath: 'inset(0% 0 0 0)', duration: 0.7, ease: 'power3.inOut', delay: 0.35 }
      )
    }

    gsap.to(modal, {
      clipPath: 'inset(0 0 0% 0)',
      duration: 0.7,
      ease: 'power3.inOut',
      onComplete: () => {
        isOpen = true
        isAnimating = false
      },
    })
  }

  // ---- Close modal ----
  function closeModal() {
    if (!isOpen || isAnimating) return
    isAnimating = true
    stopAutoAdvance()

    // Pause all videos in the modal
    modal.querySelectorAll('[data-modal-video="video"]').forEach((v) => v.pause())

    // Rotate close icon back before modal finishes closing
    if (closeIcon) {
      gsap.to(closeIcon, {
        rotation: 0,
        duration: 0.35,
        ease: 'power2.in',
      })
    }

    // Fade CTA out quickly, then reset clipPath once modal is hidden
    if (modalCta) {
      gsap.to(modalCta, { opacity: 0, duration: 0.25, ease: 'power2.in' })
    }

    gsap.to(modal, {
      clipPath: 'inset(0 0 100% 0)',
      duration: 0.7,
      ease: 'power3.inOut',
      onComplete: () => {
        // Reset CTA for next open
        if (modalCta) gsap.set(modalCta, { opacity: 1, clipPath: 'inset(100% 0 0 0)' })
        gsap.set(modal, { display: 'none' })
        modal.setAttribute('data-modal-state', 'closed')
        unlockScroll()
        // Re-enable ScrollTriggers but delay refresh to sync with overflow removal
        ScrollTrigger.getAll().forEach(st => st.enable())
        requestAnimationFrame(() => ScrollTrigger.refresh())

        isOpen = false
        isAnimating = false
      },
    })
  }

  // ---- Event listeners ----

  // Cards → open modal with corresponding tab
  cards.forEach((card, index) => {
    card.addEventListener('click', () => openModal(index), { signal: _signal })
  })
  tabLinks.forEach((link, index) => {
    link.addEventListener('click', () => setActiveTab(index, true), { signal: _signal })
  })
  closeBtns.forEach((btn) => {
    btn.addEventListener('click', closeModal, { signal: _signal })
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal()
  }, { signal: _signal })
}

return () => {
  _ac.abort()
  if (typeof stopAutoAdvance === 'function') stopAutoAdvance()
  if (typeof isOpen !== 'undefined' && isOpen) closeModal()
}
})

mm.add('(max-width: 991px)', () => {
  const _ac = new AbortController()
  const _signal = _ac.signal
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

  // Track dynamically created videos per card so we can clean them up
  const cardVideos = new Map()

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
    video.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:none;z-index:2;'
    const source = document.createElement('source')
    source.src = src
    source.type = 'video/mp4'
    video.appendChild(source)
    if (poster) video.poster = poster

    // Append inside the image wrapper of this card
    const imageWrapper = card.querySelector('.product-overview_card-image-wrapper')
    if (imageWrapper) imageWrapper.appendChild(video)

    cardVideos.set(key, video)
    return video
  }

  // Destroy all dynamic videos for a card
  function destroyCardVideos(cardIndex) {
    for (const [key, video] of cardVideos) {
      if (key.startsWith(`${cardIndex}-`)) {
        video.pause()
        video.remove()
        cardVideos.delete(key)
      }
    }
  }

  function closeCard(card) {
    const dropdown = card.querySelector('.product-overview_card-tablet')
    const icon = card.querySelector('.icon_plus')
    if (!dropdown) return

    // Pause and destroy dynamic videos
    const cardIndex = [...allCards].indexOf(card)
    destroyCardVideos(cardIndex)

    // Also pause any static videos that might exist in the HTML
    card.querySelectorAll('[data-modal-video="video"]').forEach((v) => {
      v.pause()
      v.style.display = 'none'
    })

    const cta = card.querySelector('.product-overview_card-tablet .product_modal-cta')
    const textItems = dropdown.querySelectorAll('.product_modal-tab-text-item')

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

    // Reset to first item + main image
    textItems.forEach((t, i) => t.classList.toggle('is-active', i === 0))
    const images = card.querySelectorAll('.product-overview_card-image')
    images.forEach((img) => {
      gsap.to(img, { opacity: img.classList.contains('is-main') ? 1 : 0, duration: 0.4 })
    })
  }

  function openCardDropdown(card, cardIndex) {
    const dropdown = card.querySelector('.product-overview_card-tablet')
    const icon = card.querySelector('.icon_plus')
    if (!dropdown) return

    // Set first item active, prepare stagger entrance
    const textItems = dropdown.querySelectorAll('.product_modal-tab-text-item')
    textItems.forEach((t, i) => {
      t.classList.toggle('is-active', i === 0)
      gsap.set(t, { clipPath: 'inset(0 100% 0 0)' })
    })
    const cta = card.querySelector('.product-overview_card-tablet .product_modal-cta')
    if (cta) gsap.set(cta, { clipPath: 'inset(0 0 100% 0)' })

    // Measure height without flashing content
    gsap.set(dropdown, { height: 'auto', visibility: 'hidden' })
    const h = dropdown.scrollHeight
    gsap.set(dropdown, { visibility: 'visible' })
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

    // Show video for the first item (index 0) on open
    switchCardImage(card, cardIndex, 0)
  }

  // Image/video crossfade: index 0 → is-main image, index N → video from modal
  function switchCardImage(card, cardIndex, index) {
    const images = card.querySelectorAll('.product-overview_card-image')

    // Pause all existing dynamic videos for this card
    for (const [key, video] of cardVideos) {
      if (key.startsWith(`${cardIndex}-`)) {
        video.pause()
        video.style.display = 'none'
      }
    }

    // Also pause any static HTML videos
    card.querySelectorAll('[data-modal-video="video"]').forEach((v) => {
      v.pause()
      v.style.display = 'none'
    })

    // Try to show video for the selected item
    const video = getOrCreateVideo(card, cardIndex, index)
    if (video) {
      // Hide all card images (is-main is an <img>, not a container)
      images.forEach((img) => {
        gsap.killTweensOf(img)
        gsap.set(img, { opacity: 0 })
      })
      video.style.display = 'block'
      video.currentTime = 0
      video.play().catch(() => {})
    } else {
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
        closeCard(card)
        openCard = null
      } else {
        if (openCard) closeCard(openCard)
        openCardDropdown(card, cardIndex)
        openCard = card
      }
    }, { signal: _signal })

    // Text item tap → switch image/video (first item keeps main image)
    const textItems = dropdown.querySelectorAll('.product_modal-tab-text-item')
    textItems.forEach((item, index) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation()
        textItems.forEach((t, i) => t.classList.toggle('is-active', i === index))
        switchCardImage(card, cardIndex, index)
      }, { signal: _signal })
    })
  })

  return () => {
    _ac.abort()
    if (openCard) { closeCard(openCard); openCard = null }
    // Destroy all dynamic videos
    for (const [, video] of cardVideos) {
      video.pause()
      video.remove()
    }
    cardVideos.clear()
    // Reset dropdowns and images
    allCards.forEach((card) => {
      const dropdown = card.querySelector('.product-overview_card-tablet')
      if (dropdown) gsap.set(dropdown, { height: 0, overflow: 'hidden' })
      const textItems = dropdown ? dropdown.querySelectorAll('.product_modal-tab-text-item') : []
      textItems.forEach((t) => gsap.set(t, { clipPath: 'inset(0 100% 0 0)' }))
      const cta = card.querySelector('.product-overview_card-tablet .product_modal-cta')
      if (cta) gsap.set(cta, { clipPath: 'inset(0 0 100% 0)' })
      const images = card.querySelectorAll('.product-overview_card-image')
      images.forEach((img) => {
        if (!img.classList.contains('is-main')) {
          gsap.set(img, { opacity: 0 })
        } else {
          gsap.set(img, { opacity: 1 })
        }
      })
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