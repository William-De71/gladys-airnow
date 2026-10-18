// -----------------------------------------------------------------------------
// Dashboard widgets of the AirNow integration.
//
//   - `air_quality`  the AQI now, like the AirNow dial: the overall value in
//                    the color of its category, PM2.5, ozone and PM10, the
//                    health message of the category, the hour of the
//                    observation and the reporting area;
//   - `forecast`     the forecast of the next days, one card per day with its
//                    category badge and its main pollutant; a tap shows the
//                    discussion of the forecaster. An Air Quality Action Day
//                    is announced on top.
// Both credit AirNow and say the data are preliminary (AirNow's data use
// guidelines). A place is chosen among the devices; the first one by default.
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { t, all, categoryText, pollutantText } from './i18n.js';
import { dayKeyOf } from './events.js';
import { rankOf } from './aqi.js';
import { formatTime, formatDay } from './time.js';

const WIDGETS = { AIR_QUALITY: 'air_quality', FORECAST: 'forecast' };
const WIDGET_ACTIONS = { REFRESH: 'refresh' };
const TTL_SECONDS = { content: 600, message: 300 };
const MAX_DAYS = 6;
const COLORS = {
  good: WIDGET_COLORS.SUCCESS,
  moderate: WIDGET_COLORS.WARNING,
  sensitive: WIDGET_COLORS.WARNING,
  unhealthy: WIDGET_COLORS.DANGER,
  very_unhealthy: WIDGET_COLORS.DANGER,
  hazardous: WIDGET_COLORS.DANGER,
};
const TILES = ['pm25', 'ozone', 'pm10'];

/**
 * @description Truncate a text to a bound, with an ellipsis.
 * @param {string} value - The text.
 * @param {number} max - The bound.
 * @returns {string} The text.
 */
function clip(value, max) {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * @description The color of a category.
 * @param {string|null} category - The category key.
 * @returns {string} A widget color.
 */
const colorOf = (category) => COLORS[category] ?? WIDGET_COLORS.NEUTRAL;

/**
 * @description The Refresh button.
 * @returns {object} The button.
 */
const refreshButton = () => ({
  type: 'button',
  label: all('buttonRefresh'),
  icon: 'refresh-cw',
  action: { key: WIDGET_ACTIONS.REFRESH },
});

/**
 * @description A widget content made of one message.
 * @param {string} message - The message.
 * @param {object} [options] - `{ ttl, refresh }`.
 * @returns {object} The content.
 */
function messageContent(message, { ttl = TTL_SECONDS.message, refresh = false } = {}) {
  const components = [{ type: 'text', variant: 'body', text: clip(message, 300) }];
  if (refresh) {
    components.push(refreshButton());
  }
  return { ttl_seconds: ttl, components };
}

/**
 * @description The "air_quality" widget.
 * @param {object} options - Options.
 * @param {object} options.place - `{ area, label }`.
 * @param {object|null} options.observations - The parsed observations.
 * @param {string} options.language - The user language.
 * @param {string} [options.timeZone] - IANA timezone.
 * @returns {object} The content.
 */
function buildAirQualityWidget({ place, observations, language, timeZone }) {
  const area = place.area || place.label;
  if (!observations) {
    return {
      ttl_seconds: TTL_SECONDS.message,
      components: [
        { type: 'text', variant: 'heading', text: clip(area, 40) },
        { type: 'text', variant: 'body', text: clip(t('noObservation', language), 300) },
        refreshButton(),
      ],
    };
  }
  const components = [
    {
      type: 'text',
      variant: 'caption',
      text: clip(
        [
          area,
          t('observedAt', language, {
            time: formatTime(observations.observedAt, { language, timeZone }),
          }),
        ]
          .filter(Boolean)
          .join(' · '),
        80,
      ),
    },
    {
      type: 'value',
      value: observations.aqi,
      label: clip(
        `${t('tileAqi', language)} · ${categoryText(observations.category, language, true)}`,
        24,
      ),
      icon: 'wind',
      color: colorOf(observations.category),
    },
  ];
  for (const pollutant of TILES) {
    const reading = observations.pollutants[pollutant];
    if (reading) {
      components.push({
        type: 'value',
        value: reading.aqi,
        label: clip(pollutantText(pollutant, language), 24),
        color: colorOf(reading.category),
      });
    }
  }
  components.push({
    type: 'text',
    variant: 'body',
    text: clip(
      `${categoryText(observations.category, language)}. ${t(`advice_${observations.category}`, language)}\n${t('credit', language, { agency: observations.agency || 'AirNow' })}.`,
      300,
    ),
  });
  components.push(refreshButton());
  return { ttl_seconds: TTL_SECONDS.content, components };
}

/**
 * @description The "forecast" widget.
 * @param {object} options - Options.
 * @param {object} options.place - `{ area, label }`.
 * @param {object|null} options.forecast - The parsed forecast.
 * @param {string} options.today - Today, in the reporting area.
 * @param {string} options.language - The user language.
 * @returns {object} The content.
 */
function buildForecastWidget({ place, forecast, today, language }) {
  const area = forecast?.area || place.area || place.label;
  const days = (forecast?.days ?? []).filter((day) => dayKeyOf(day.date, today)).slice(0, MAX_DAYS);
  const heading = { type: 'text', variant: 'heading', text: clip(area, 40) };
  if (days.length === 0) {
    return {
      ttl_seconds: TTL_SECONDS.content,
      components: [
        heading,
        { type: 'text', variant: 'body', text: clip(t('noForecast', language), 300) },
      ],
    };
  }
  const dayName = (day) => {
    const key = dayKeyOf(day.date, today);
    if (key === 'today') {
      return t('dayToday', language);
    }
    return key === 'tomorrow' ? t('dayTomorrow', language) : formatDay(day.date, language);
  };
  const components = [
    heading,
    {
      type: 'card-list',
      display: 'list',
      items: days.map((day) => {
        const pollutant = pollutantText(day.pollutant, language);
        const item = {
          title: clip(
            day.actionDay
              ? `${dayName(day)} · ⚠ ${t('forecastActionDay', language)}`
              : dayName(day),
            60,
          ),
          subtitle: clip(
            Number.isFinite(day.aqi)
              ? t('forecastAqi', language, { pollutant, aqi: day.aqi })
              : pollutant,
            60,
          ),
          badge: {
            text: clip(categoryText(day.category, language, true), 16),
            color: colorOf(day.category),
          },
        };
        const details = [
          categoryText(day.category, language),
          t(`advice_${day.category}`, language),
          day.discussion,
        ]
          .filter(Boolean)
          .join('\n\n');
        item.description = clip(details, 2000);
        return item;
      }),
    },
  ];
  const issued = forecast.issued
    ? t('issuedOn', language, {
        date: formatDay(forecast.issued, language),
        agency: forecast.agency || 'AirNow',
      })
    : t('credit', language, { agency: forecast.agency || 'AirNow' });
  // Two texts at most: with an alert, the body carries the issuance too.
  const alerts = days.filter((day) => day.actionDay);
  if (alerts.length) {
    const worst = alerts.reduce((a, b) => (rankOf(b.category) > rankOf(a.category) ? b : a));
    const alert = t('actionDayBody', language, {
      // "Today" and "Tomorrow" in the middle of a sentence.
      days: alerts
        .map((day) =>
          dayKeyOf(day.date, today) === 'later'
            ? dayName(day)
            : dayName(day).toLocaleLowerCase(language),
        )
        .join(', '),
      advice: t(`advice_${worst.category}`, language),
    });
    components.push({ type: 'text', variant: 'body', text: clip(`${alert}\n${issued}.`, 300) });
  } else {
    components.push({ type: 'text', variant: 'caption', text: clip(issued, 80) });
  }
  return { ttl_seconds: TTL_SECONDS.content, components };
}

export {
  WIDGETS,
  WIDGET_ACTIONS,
  TTL_SECONDS,
  COLORS,
  clip,
  colorOf,
  messageContent,
  buildAirQualityWidget,
  buildForecastWidget,
};
