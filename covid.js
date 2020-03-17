/* global d3 */

/* firstly let takes our sources and put them in an array */
const sources = [
  'https://cdn.jsdelivr.net/gh/CSSEGISandData/COVID-19@master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv',
  'https://cdn.jsdelivr.net/gh/CSSEGISandData/COVID-19@master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Deaths.csv',
  'https://cdn.jsdelivr.net/gh/CSSEGISandData/COVID-19@master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Recovered.csv'
]

const height = 500 || document.body.clientHeight

const width = document.body.clientWidth
const margin = ({top: 20, right: 20, bottom: 30, left: 50})

let timeSerie = {}

const chart = (data, options) => {
  const hover = (svg, path) => {
    if ('ontouchstart' in document) svg
      .style('-webkit-tap-highlight-color', 'transparent')
      .on('touchmove', moved)
      .on('touchstart', entered)
      .on('touchend', left)
    else svg
      .on('mousemove', moved)
      .on('mouseenter', entered)
      .on('mouseleave', left)

    const dot = svg.append('g')
      .attr('display', 'none')

    dot.append('circle')
      .attr('r', 2.5)

    dot.append('text')
      .style('font', '10px sans-serif')
      .attr('text-anchor', 'middle')
      .attr('y', -8)

    function moved() {
      d3.event.preventDefault()
      const ym = y.invert(d3.event.layerY)
      const xm = x.invert(d3.event.layerX)
      const i1 = d3.bisectLeft(data.dates, xm, 1)
      const i0 = i1 - 1
      const i = xm - data.dates[i0] > data.dates[i1] - xm ? i1 : i0
      const s = data.series[options.yOption].reduce((a, b) => Math.abs(a.values[i] - ym) < Math.abs(b.values[i] - ym) ? a : b)
      path.attr('stroke', d => d === s ? null : '#ddd').filter(d => d === s).raise()
      dot.attr('transform', `translate(${x(data.dates[i])},${y(s.values[i])})`)
      dot.select('text').text(s.name + ': ' + s.values[i] + ' ' + options.yOption + ' ' + data.dates[i].toLocaleDateString())
    }

    function entered() {
      path.style('mix-blend-mode', null).attr('stroke', '#ddd')
      dot.attr('display', null)
    }

    function left() {
      path.style('mix-blend-mode', 'multiply').attr('stroke', null)
      dot.attr('display', 'none')
    }
  }

  const svg = d3.create("svg")
    .attr('viewBox', [0, 0, width, height])
    .style('overflow', 'visible')


    const x = options.xOption === "time"
        ? d3.scaleTime().domain(d3.extent(data.dates)).range([margin.left, width - margin.right])
        : d3[options.logOption ? "scaleLog" : "scaleLinear"]().domain([
            options.logOption ? 1 : 0,

            d3.max(data.series[options.xOption], (d) => d3.max(d.values))
          ]).range([margin.left, width - margin.right])

    const y = d3[options.logOption ? "scaleLog" : "scaleLinear"]().domain([
      options.logOption ? 1 : 0,
      d3.max(data.series[options.yOption], d => d3.max(d.values))
    ]).range([height - margin.bottom, margin.top]);
    var logAxisLeft = d3.axisLeft(y)
    var logAxisBottom = d3.axisBottom(x)
    if (options.logOption) {
       logAxisLeft = d3.axisLeft(y).tickFormat(d => (String(d)[0] === "1" ? d3.format(",d")(d) : ""))
      if (options.xOption !== "time"){
         logAxisBottom = d3.axisBottom(x).tickFormat(d => (String(d)[0] === "1" ? d3.format(",d")(d) : ""))
      }
    }

    const xAxis = g => g
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(logAxisBottom.ticks(width / 80).tickSizeOuter(0))

      const yAxis = g => g
        .attr('transform', `translate(${margin.left},0)`)
        .call(logAxisLeft)
        .call(g => g.select('.domain')
          .remove()
        )
        .call(g => g.select('.tick:last-of-type text')
          .clone()
          .attr('x', 3)
          .attr('text-anchor', 'start')
          .attr('font-weight', 'bold')
          .text(options.yOption + ' cases')
        )


  const line = d3.line()
  .curve(d3.curveMonotoneY)
    // .defined(d => !isNaN(d.val))
    .x((d, i) => x(
      options.xOption === 'time' ?
        data.dates[i] :
        data.series[options.xOption].find(a => a.name === d.name).values[i])
      )
    .y(d => y(d.val||1))

  svg.append('g')
    .call(xAxis)

  svg.append('g')
    .call(yAxis)

  const path = svg.append('g')
    .attr('fill', 'none')
    .attr('stroke', 'steelblue')
    .attr('stroke-width', 1.5)
    .attr('stroke-linejoin', 'round')
    .attr('stroke-linecap', 'round')
    .selectAll('path')
    .data(data.series[options.yOption])
    .join('path')
    .style('mix-blend-mode', 'multiply')
    .attr('d', d => line(d.values.map(val => ({val:val, name:d.name}))))

    const labels = svg.append("g");
    labels
      .selectAll("text")
      .data(data.series[options.yOption])
      .join("text")
      .text(d => d[0])
      .attr(
        "transform",
        (d,i )=>
          `translate(${x(d.values[d.values.length - 1] || 1)},${y(
            data.dates[i] || 1
          ) - 5})`
      )
      .attr("text-anchor", "middle")
      .attr("dx", -6)
      .attr("dy", -4)
      .style("fill", d => '#333');


  svg.call(hover, path)
  return svg.node()
}

/* resolve all promises  */
Promise.all(
  sources.map(
    /* of processed ressources */
    source => fetch(source)
      /* the source is csv and must be parsed as text*/
      .then(response => response.text())
      /* parse the text/csv and convert to json */
      .then(data => csv({
          output: "json",
          noheader: false,
        })
        .fromString(data)
      )
  ))
  .then(resolvedJSONs => {
    /* here you got an array of the same length of the sources filled */
    var dates = resolvedJSONs[0]
      .reduce((hold, placeCases) => {
        return hold.concat(Object.keys(placeCases).filter(key => key[1] === '/'))
      }, [])

    dates = [...new Set(dates)]
    const generateSeries = (data, dates) => {
      return data.reduce((series, placeCases) => {
          let existingSerie = series.some(serie => serie.name === placeCases['Country/Region'])
          if (existingSerie) {
            series = series.map(serie => {
              if (serie.name ===  placeCases['Country/Region']) {
                var neo = dates.map((day, i) => {
                  return Number( placeCases[day] )
                })
                serie.values = serie.values.map((val, i) => val + neo[i])
              }
              return serie
            })
          } else {
            /* there is a both confusion and a typo with french guiana and Co-operative Republic of Guyana which are neighboor, french guiana is a province of france whereas Guyana is a proper country */
            /* nota bene in french language guiana is written French Guyana (Guyane Francaise) same as the Republic of Guyana */
            placeCases['Country/Region'] === 'French Guiana' ? (placeCases['Country/Region'] = 'Guyana') : ''

            var serie = {
              name: placeCases['Country/Region'],
              values: dates.map((day, i) => {
                return Number(placeCases[day])
              })
            }
            series.push(serie)
          }
          return series
        }, []).sort((a,b) => a.values[a.values.length - 1] > b.values[b.values.length - 1] ? -1 : +1)
    }
    var confirmed = generateSeries(resolvedJSONs[0], dates)
    var death = generateSeries(resolvedJSONs[1], dates)
    var recovered = generateSeries(resolvedJSONs[2], dates)

    timeSerie = {
      dates: dates.map(d3.utcParse("%m/%e/%y")),
      series: {
        confirmed: confirmed,
        death: death,
        recovered:recovered
        }
    }

    var buttons =
    confirmed.map((confirm, i) => {
      var button = document.createElement('input')
      button.setAttribute('type', 'button')
      button.value = confirm.name + ' ' + confirm.values[confirm.values.length -1]
      button.classList.toggle('selected', i < 15)
      button.classList.toggle(confirm.name.replace(/ |\*|\(|\)|'/g, '-'))
      button.onclick = () => {
        button.classList.toggle('selected')
        build()
      }
      document.body.querySelector('.controls .countries').append(button)
      return button
    })

    build()
  })

/* forms */
document.querySelector('.activate-controls').onclick = () => {
  document.querySelector('.controls').style.display = document.querySelector('.controls').style.display === 'none' ? "block" : "none"
}
const logScale = document.createElement('input')
logScale.classList.add('log-scale')
logScale.setAttribute('type', 'checkbox')
logScale.checked = true
const logScaleLabel = document.createElement('label')
logScaleLabel.innerText = 'logarithmic scale'
document.body.querySelector('.controls').prepend(logScaleLabel)
document.body.querySelector('.controls').prepend(logScale)

const xSelector = document.createElement('select')
xSelector.classList.add('x-selector')
document.body.querySelector('.controls').prepend(xSelector)
const xLabel = document.createElement('label')
xLabel.innerText = 'Ordinate'
document.body.querySelector('.controls').prepend(xLabel)

let xOptions0 = document.createElement('option')
xOptions0.innerText = 'time'
let xOptions1 = document.createElement('option')
xOptions1.innerText = 'confirmed'
let xOptions2 = document.createElement('option')
xOptions2.innerText = 'death'
let xOptions3 = document.createElement('option')
xOptions3.innerText = 'recovered'
xSelector.prepend(xOptions0)
xSelector.prepend(xOptions1)
xSelector.prepend(xOptions2)
xSelector.prepend(xOptions3)

const ySelector = document.createElement('select')
ySelector.classList.add('y-selector')
document.body.querySelector('.controls').prepend(ySelector)
const yLabel = document.createElement('label')
yLabel.innerText = 'Abscissa'
document.body.querySelector('.controls').prepend(yLabel)

let yOptions1 = document.createElement('option')
yOptions1.innerText = 'confirmed'
let yOptions2 = document.createElement('option')
yOptions2.innerText = 'death'
let yOptions3 = document.createElement('option')
yOptions3.innerText = 'recovered'
ySelector.prepend(yOptions1)
ySelector.prepend(yOptions2)
ySelector.prepend(yOptions3)

let build = ySelector.onchange = xSelector.onchange = logScale.onclick = () => {
  const svg = document.querySelector('svg')
  svg && svg.remove()

  document.body.prepend(chart({...timeSerie, ...{
    series: {
      confirmed: timeSerie.series.confirmed.filter(a => document.querySelector('input.selected.' + a.name.replace(/ |\*|\(|\)|\'/g, '-')) ),
      death: timeSerie.series.death.filter(a => document.querySelector('input.selected.' + a.name.replace(/ |\*|\(|\)|\'/g, '-'))) ,
      recovered:timeSerie.series.recovered.filter(a => document.querySelector('input.selected.'+ a.name.replace(/ |\*|\(|\)|\'/g, '-')))
      }
  }}, {
    xOption: document.querySelector('.x-selector option:checked').innerText,
    yOption: document.querySelector('.y-selector option:checked').innerText,
    logOption: document.querySelector('.log-scale').checked
  }))
}
