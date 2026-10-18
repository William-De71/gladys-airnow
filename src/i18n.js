// -----------------------------------------------------------------------------
// Texts of the integration, in English, French, German and Spanish (English
// fallback).
//
// The manifest carries its own labels; these are the texts the code writes at
// runtime: device and feature names, AQI categories and their health
// messages (after the EPA's "Air Quality Guide"), widget contents, statuses,
// scene texts. Vocabulary of the Gladys interface (appareil / Gerät /
// dispositivo). Reporting areas and agencies are never translated.
// -----------------------------------------------------------------------------

const LANGUAGES = ['en', 'fr', 'de', 'es'];

const TEXTS = {
  // devices
  deviceName: {
    en: 'AirNow {area}',
    fr: 'AirNow {area}',
    de: 'AirNow {area}',
    es: 'AirNow {area}',
  },
  featureAqi: {
    en: 'Air Quality Index',
    fr: 'Indice de qualité de l’air',
    de: 'Luftqualitätsindex',
    es: 'Índice de calidad del aire',
  },
  featurePm25: {
    en: 'PM2.5 (AQI)',
    fr: 'PM2,5 (AQI)',
    de: 'PM2,5 (AQI)',
    es: 'PM2,5 (AQI)',
  },
  featureOzone: {
    en: 'Ozone (AQI)',
    fr: 'Ozone (AQI)',
    de: 'Ozon (AQI)',
    es: 'Ozono (AQI)',
  },
  featurePm10: {
    en: 'PM10 (AQI)',
    fr: 'PM10 (AQI)',
    de: 'PM10 (AQI)',
    es: 'PM10 (AQI)',
  },
  featureCategory: {
    en: 'Air quality',
    fr: 'Qualité de l’air',
    de: 'Luftqualität',
    es: 'Calidad del aire',
  },
  featureForecastToday: {
    en: 'Forecast AQI today',
    fr: 'AQI prévu aujourd’hui',
    de: 'Vorhergesagter AQI heute',
    es: 'AQI previsto hoy',
  },
  featureForecastTomorrow: {
    en: 'Forecast AQI tomorrow',
    fr: 'AQI prévu demain',
    de: 'Vorhergesagter AQI morgen',
    es: 'AQI previsto mañana',
  },
  featureForecast: {
    en: 'Forecast',
    fr: 'Prévision',
    de: 'Vorhersage',
    es: 'Previsión',
  },

  // AQI categories: full names, short ones (badges, 16 characters), advice
  category_good: { en: 'Good', fr: 'Bon', de: 'Gut', es: 'Buena' },
  category_moderate: { en: 'Moderate', fr: 'Modéré', de: 'Mäßig', es: 'Moderada' },
  category_sensitive: {
    en: 'Unhealthy for sensitive groups',
    fr: 'Mauvais pour les personnes sensibles',
    de: 'Ungesund für empfindliche Gruppen',
    es: 'Dañina para grupos sensibles',
  },
  category_unhealthy: { en: 'Unhealthy', fr: 'Mauvais', de: 'Ungesund', es: 'Dañina' },
  category_very_unhealthy: {
    en: 'Very unhealthy',
    fr: 'Très mauvais',
    de: 'Sehr ungesund',
    es: 'Muy dañina',
  },
  category_hazardous: { en: 'Hazardous', fr: 'Dangereux', de: 'Gefährlich', es: 'Peligrosa' },
  short_good: { en: 'Good', fr: 'Bon', de: 'Gut', es: 'Buena' },
  short_moderate: { en: 'Moderate', fr: 'Modéré', de: 'Mäßig', es: 'Moderada' },
  short_sensitive: {
    en: 'Sensitive groups',
    fr: 'Pers. sensibles',
    de: 'Empfindliche',
    es: 'Grupos sensibles',
  },
  short_unhealthy: { en: 'Unhealthy', fr: 'Mauvais', de: 'Ungesund', es: 'Dañina' },
  short_very_unhealthy: {
    en: 'Very unhealthy',
    fr: 'Très mauvais',
    de: 'Sehr ungesund',
    es: 'Muy dañina',
  },
  short_hazardous: { en: 'Hazardous', fr: 'Dangereux', de: 'Gefährlich', es: 'Peligrosa' },
  advice_good: {
    en: 'Air quality is satisfactory: a great day to be active outside.',
    fr: 'La qualité de l’air est satisfaisante : une belle journée pour bouger dehors.',
    de: 'Die Luftqualität ist zufriedenstellend: ein guter Tag für Aktivitäten im Freien.',
    es: 'La calidad del aire es satisfactoria: un buen día para estar activo al aire libre.',
  },
  advice_moderate: {
    en: 'Unusually sensitive people should consider making long or intense outdoor efforts lighter.',
    fr: 'Les personnes particulièrement sensibles devraient alléger les efforts longs ou intenses en extérieur.',
    de: 'Besonders empfindliche Menschen sollten lange oder intensive Anstrengungen im Freien reduzieren.',
    es: 'Las personas especialmente sensibles deberían reducir los esfuerzos largos o intensos al aire libre.',
  },
  advice_sensitive: {
    en: 'Sensitive groups (asthma, heart disease, children, older adults) should reduce long or intense outdoor efforts.',
    fr: 'Les personnes sensibles (asthme, maladies cardiaques, enfants, seniors) devraient réduire les efforts longs ou intenses dehors.',
    de: 'Empfindliche Gruppen (Asthma, Herzkrankheiten, Kinder, Ältere) sollten lange oder intensive Anstrengungen im Freien reduzieren.',
    es: 'Los grupos sensibles (asma, enfermedades cardíacas, niños, mayores) deberían reducir los esfuerzos largos o intensos al aire libre.',
  },
  advice_unhealthy: {
    en: 'Everyone should reduce long or intense outdoor efforts; sensitive groups should avoid them.',
    fr: 'Tout le monde devrait réduire les efforts longs ou intenses dehors ; les personnes sensibles devraient les éviter.',
    de: 'Alle sollten lange oder intensive Anstrengungen im Freien reduzieren; empfindliche Gruppen sollten sie meiden.',
    es: 'Todos deberían reducir los esfuerzos largos o intensos al aire libre; los grupos sensibles deberían evitarlos.',
  },
  advice_very_unhealthy: {
    en: 'Everyone should avoid long or intense outdoor efforts; sensitive groups should stay indoors.',
    fr: 'Tout le monde devrait éviter les efforts longs ou intenses dehors ; les personnes sensibles devraient rester à l’intérieur.',
    de: 'Alle sollten lange oder intensive Anstrengungen im Freien meiden; empfindliche Gruppen sollten drinnen bleiben.',
    es: 'Todos deberían evitar los esfuerzos largos o intensos al aire libre; los grupos sensibles deberían quedarse en interiores.',
  },
  advice_hazardous: {
    en: 'Health alert: everyone should avoid all physical activity outdoors and keep windows closed.',
    fr: 'Alerte sanitaire : tout le monde devrait éviter toute activité physique dehors et garder les fenêtres fermées.',
    de: 'Gesundheitswarnung: Alle sollten jede körperliche Aktivität im Freien meiden und die Fenster geschlossen halten.',
    es: 'Alerta sanitaria: todos deberían evitar cualquier actividad física al aire libre y mantener las ventanas cerradas.',
  },

  // pollutants
  pollutant_pm25: { en: 'PM2.5', fr: 'PM2,5', de: 'PM2,5', es: 'PM2,5' },
  pollutant_pm10: { en: 'PM10', fr: 'PM10', de: 'PM10', es: 'PM10' },
  pollutant_ozone: { en: 'Ozone', fr: 'Ozone', de: 'Ozon', es: 'Ozono' },
  pollutant_no2: { en: 'NO₂', fr: 'NO₂', de: 'NO₂', es: 'NO₂' },
  pollutant_co: { en: 'CO', fr: 'CO', de: 'CO', es: 'CO' },
  pollutant_so2: { en: 'SO₂', fr: 'SO₂', de: 'SO₂', es: 'SO₂' },

  // days
  dayToday: { en: 'Today', fr: 'Aujourd’hui', de: 'Heute', es: 'Hoy' },
  dayTomorrow: { en: 'Tomorrow', fr: 'Demain', de: 'Morgen', es: 'Mañana' },

  // forecast text of the device, summaries
  forecastText: {
    en: '{day}: {category} ({pollutant})',
    fr: '{day} : {category} ({pollutant})',
    de: '{day}: {category} ({pollutant})',
    es: '{day}: {category} ({pollutant})',
  },
  forecastActionDay: {
    en: 'air quality alert',
    fr: 'alerte qualité de l’air',
    de: 'Luftqualitätswarnung',
    es: 'alerta de calidad del aire',
  },
  summaryNow: {
    en: 'Air quality in {area}: {category}, AQI {aqi} ({pollutant}).',
    fr: 'Qualité de l’air à {area} : {category}, AQI {aqi} ({pollutant}).',
    de: 'Luftqualität in {area}: {category}, AQI {aqi} ({pollutant}).',
    es: 'Calidad del aire en {area}: {category}, AQI {aqi} ({pollutant}).',
  },
  summaryNoNow: {
    en: 'No current observation for {area}.',
    fr: 'Aucune observation en cours pour {area}.',
    de: 'Keine aktuelle Messung für {area}.',
    es: 'No hay observación actual para {area}.',
  },
  summaryTomorrow: {
    en: 'Tomorrow: {category} ({pollutant}).',
    fr: 'Demain : {category} ({pollutant}).',
    de: 'Morgen: {category} ({pollutant}).',
    es: 'Mañana: {category} ({pollutant}).',
  },

  // connection status and errors
  statusConnected: {
    en: 'Connected to AirNow: {places}.',
    fr: 'Connecté à AirNow : {places}.',
    de: 'Mit AirNow verbunden: {places}.',
    es: 'Conectado a AirNow: {places}.',
  },
  statusNoPlace: {
    en: 'Connected to AirNow. Choose a house or a ZIP code in the configuration.',
    fr: 'Connecté à AirNow. Choisissez une maison ou un code ZIP dans la configuration.',
    de: 'Mit AirNow verbunden. Wähle in der Konfiguration ein Haus oder eine ZIP-Postleitzahl.',
    es: 'Conectado a AirNow. Elija una casa o un código ZIP en la configuración.',
  },
  statusSomeFailing: {
    en: '{ok} of {total} places read. {detail}',
    fr: '{ok} lieu(x) lu(s) sur {total}. {detail}',
    de: '{ok} von {total} Orten gelesen. {detail}',
    es: '{ok} de {total} lugares leídos. {detail}',
  },
  errNoKey: {
    en: 'Enter your AirNow API key in the configuration (free at docs.airnowapi.org).',
    fr: 'Saisissez votre clé d’API AirNow dans la configuration (gratuite sur docs.airnowapi.org).',
    de: 'Gib deinen AirNow-API-Schlüssel in der Konfiguration ein (kostenlos auf docs.airnowapi.org).',
    es: 'Introduzca su clave de API de AirNow en la configuración (gratuita en docs.airnowapi.org).',
  },
  errAuth: {
    en: 'AirNow refused the API key: check it on docs.airnowapi.org.',
    fr: 'AirNow a refusé la clé d’API : vérifiez-la sur docs.airnowapi.org.',
    de: 'AirNow hat den API-Schlüssel abgelehnt: prüfe ihn auf docs.airnowapi.org.',
    es: 'AirNow rechazó la clave de API: compruébela en docs.airnowapi.org.',
  },
  errNoData: {
    en: 'AirNow has no data near {place}: no reporting area or monitor within its lookup distance.',
    fr: 'AirNow n’a pas de données près de {place} : aucune zone ni station dans son rayon de recherche.',
    de: 'AirNow hat keine Daten nahe {place}: kein Berichtsgebiet und keine Messstation im Suchradius.',
    es: 'AirNow no tiene datos cerca de {place}: ninguna zona ni estación en su radio de búsqueda.',
  },
  errRateLimit: {
    en: 'AirNow limits this key for the hour: the next reading waits.',
    fr: 'AirNow limite cette clé pour l’heure : la prochaine lecture attend.',
    de: 'AirNow begrenzt diesen Schlüssel für diese Stunde: die nächste Lesung wartet.',
    es: 'AirNow limita esta clave durante la hora: la próxima lectura espera.',
  },
  errUnreachable: {
    en: 'AirNow does not answer: the next reading tries again.',
    fr: 'AirNow ne répond pas : la prochaine lecture réessaiera.',
    de: 'AirNow antwortet nicht: die nächste Lesung versucht es erneut.',
    es: 'AirNow no responde: la próxima lectura volverá a intentarlo.',
  },
  errInvalidZip: {
    en: '“{zip}” is not a ZIP code (five digits).',
    fr: '« {zip} » n’est pas un code ZIP (cinq chiffres).',
    de: '„{zip}“ ist keine ZIP-Postleitzahl (fünf Ziffern).',
    es: '«{zip}» no es un código ZIP (cinco dígitos).',
  },
  errUnknownHouse: {
    en: 'Place {slot}: the house no longer exists in Gladys.',
    fr: 'Lieu {slot} : la maison n’existe plus dans Gladys.',
    de: 'Ort {slot}: das Haus existiert in Gladys nicht mehr.',
    es: 'Lugar {slot}: la casa ya no existe en Gladys.',
  },
  errHouseNoLocation: {
    en: 'Place {slot}: the house has no location in Gladys (Settings → Houses).',
    fr: 'Lieu {slot} : la maison n’a pas de position dans Gladys (Paramètres → Maisons).',
    de: 'Ort {slot}: das Haus hat in Gladys keinen Standort (Einstellungen → Häuser).',
    es: 'Lugar {slot}: la casa no tiene ubicación en Gladys (Ajustes → Casas).',
  },
  errFailed: {
    en: 'AirNow answered with an error: {detail}',
    fr: 'AirNow a répondu par une erreur : {detail}',
    de: 'AirNow hat mit einem Fehler geantwortet: {detail}',
    es: 'AirNow respondió con un error: {detail}',
  },

  // configuration actions
  readDone: {
    en: 'Read now: {places}.',
    fr: 'Lu maintenant : {places}.',
    de: 'Jetzt gelesen: {places}.',
    es: 'Leído ahora: {places}.',
  },
  placeLine: {
    en: '{area} AQI {aqi} ({category})',
    fr: '{area} AQI {aqi} ({category})',
    de: '{area} AQI {aqi} ({category})',
    es: '{area} AQI {aqi} ({category})',
  },
  diagnosticDone: {
    en: 'Diagnostic written to the logs of the integration ({count} line(s) “AirNow diagnostic”), without the API key.',
    fr: 'Diagnostic écrit dans les journaux de l’intégration ({count} ligne(s) « AirNow diagnostic »), sans la clé d’API.',
    de: 'Diagnose in die Logs der Integration geschrieben ({count} Zeile(n) „AirNow diagnostic“), ohne den API-Schlüssel.',
    es: 'Diagnóstico escrito en los registros de la integración ({count} línea(s) «AirNow diagnostic»), sin la clave de API.',
  },

  // widgets
  tileAqi: { en: 'AQI', fr: 'AQI', de: 'AQI', es: 'AQI' },
  observedAt: {
    en: 'Observed {time}',
    fr: 'Mesuré à {time}',
    de: 'Gemessen um {time}',
    es: 'Medido a las {time}',
  },
  issuedOn: {
    en: 'Issued {date} by {agency}',
    fr: 'Émise le {date} par {agency}',
    de: 'Ausgegeben am {date} von {agency}',
    es: 'Emitida el {date} por {agency}',
  },
  forecastAqi: {
    en: '{pollutant} · AQI {aqi}',
    fr: '{pollutant} · AQI {aqi}',
    de: '{pollutant} · AQI {aqi}',
    es: '{pollutant} · AQI {aqi}',
  },
  actionDayBody: {
    en: 'Air quality alert announced for {days}: {advice}',
    fr: 'Alerte qualité de l’air annoncée pour {days} : {advice}',
    de: 'Luftqualitätswarnung für {days} angekündigt: {advice}',
    es: 'Alerta de calidad del aire anunciada para {days}: {advice}',
  },
  noForecast: {
    en: 'No forecast is issued for this area today: some agencies forecast only part of the year.',
    fr: 'Aucune prévision n’est émise pour cette zone aujourd’hui : certaines agences ne prévoient qu’une partie de l’année.',
    de: 'Für dieses Gebiet gibt es heute keine Vorhersage: manche Behörden erstellen nur einen Teil des Jahres welche.',
    es: 'Hoy no hay previsión para esta zona: algunas agencias solo prevén parte del año.',
  },
  noObservation: {
    en: 'No current observation: the monitors near this place sent nothing this hour.',
    fr: 'Aucune observation en cours : les stations proches n’ont rien envoyé cette heure-ci.',
    de: 'Keine aktuelle Messung: die nahen Stationen haben in dieser Stunde nichts gesendet.',
    es: 'No hay observación actual: las estaciones cercanas no enviaron nada esta hora.',
  },
  noPlaceWidget: {
    en: 'Choose a house or a ZIP code in the configuration of AirNow, then create the device.',
    fr: 'Choisissez une maison ou un code ZIP dans la configuration d’AirNow, puis créez l’appareil.',
    de: 'Wähle in der Konfiguration von AirNow ein Haus oder eine ZIP-Postleitzahl und lege dann das Gerät an.',
    es: 'Elija una casa o un código ZIP en la configuración de AirNow y luego cree el dispositivo.',
  },
  buttonRefresh: { en: 'Refresh', fr: 'Actualiser', de: 'Aktualisieren', es: 'Actualizar' },
  refreshDone: {
    en: 'Read again: AQI {aqi}.',
    fr: 'Relu : AQI {aqi}.',
    de: 'Neu gelesen: AQI {aqi}.',
    es: 'Releído: AQI {aqi}.',
  },
  refreshCached: {
    en: 'Already up to date: AirNow updates once an hour.',
    fr: 'Déjà à jour : AirNow se met à jour une fois par heure.',
    de: 'Bereits aktuell: AirNow aktualisiert einmal pro Stunde.',
    es: 'Ya está al día: AirNow se actualiza una vez por hora.',
  },
  credit: {
    en: 'Preliminary data: {agency} via U.S. EPA AirNow',
    fr: 'Données provisoires : {agency} via U.S. EPA AirNow',
    de: 'Vorläufige Daten: {agency} über U.S. EPA AirNow',
    es: 'Datos provisionales: {agency} vía U.S. EPA AirNow',
  },
};

/**
 * @description Whether a value is one of the four languages.
 * @param {unknown} value - The value.
 * @returns {boolean} True for en, fr, de, es.
 */
function isLanguage(value) {
  return LANGUAGES.includes(value);
}

/**
 * @description A text in a language, its placeholders filled.
 * @param {string} key - A TEXTS key.
 * @param {string} language - The language (English when unknown).
 * @param {object} [values] - The placeholder values.
 * @returns {string} The text.
 * @example
 * t('summaryTomorrow', 'fr', { category: 'Modéré', pollutant: 'Ozone' }); // 'Demain : Modéré (Ozone).'
 */
function t(key, language, values = {}) {
  const entry = TEXTS[key];
  if (!entry) {
    return key;
  }
  const template = entry[isLanguage(language) ? language : 'en'] ?? entry.en;
  return template.replace(/\{(\w+)\}/g, (whole, name) =>
    values[name] === undefined || values[name] === null ? '' : String(values[name]),
  );
}

/**
 * @description A text in the four languages.
 * @param {string} key - A TEXTS key.
 * @param {object|Function} [values] - The values, or `(language) => values`.
 * @returns {object} `{ en, fr, de, es }`.
 */
function all(key, values = {}) {
  return Object.fromEntries(
    LANGUAGES.map((language) => [
      language,
      t(key, language, typeof values === 'function' ? values(language) : values),
    ]),
  );
}

/**
 * @description The name of a category, full or short.
 * @param {string|null} category - The category key.
 * @param {string} language - The language.
 * @param {boolean} [short] - The short form (badges).
 * @returns {string} The name, '' without a category.
 */
const categoryText = (category, language, short = false) =>
  category ? t(`${short ? 'short' : 'category'}_${category}`, language) : '';

/**
 * @description The name of a pollutant.
 * @param {string|null} pollutant - The pollutant key.
 * @param {string} language - The language.
 * @returns {string} The name.
 */
const pollutantText = (pollutant, language) =>
  pollutant ? t(`pollutant_${pollutant}`, language) : '';

export { LANGUAGES, TEXTS, isLanguage, t, all, categoryText, pollutantText };
