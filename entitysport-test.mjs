// Node.js 18+. Maximum two requests. No extra packages.
const token = process.env.ENTITYSPORT_API_TOKEN?.trim();
let requestsSent = 0;
const steps = [];

function log(label, value) {
  let text = JSON.stringify(value);
  if (token) {
    text = text.split(token).join('[REDACTED]');
    text = text
      .split(encodeURIComponent(token))
      .join('[REDACTED]');
  }
  console.log(`ENTITY_TEST ${label}: ${text}`);
}

async function get(path, params = {}) {
  if (requestsSent >= 2) throw new Error('REQUEST_LIMIT');

  if (requestsSent) {
    await new Promise(resolve => setTimeout(resolve, 1200));
  }

  const url = new URL(
    path,
    'https://restapi.entitysport.com/v2/'
  );
  url.search = new URLSearchParams({
    ...params,
    token
  }).toString();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  const step = {
    endpoint: path,
    httpStatus: null,
    apiStatus: null
  };

  steps.push(step);
  requestsSent++;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      redirect: 'error'
    });

    step.httpStatus = res.status;
    if (!res.ok) throw new Error(`HTTP_${res.status}`);

    let body;
    try {
      body = await res.json();
    } catch {
      throw new Error('INVALID_JSON');
    }

    const status = String(body?.status ?? '').toLowerCase();
    const known = [
      'ok', 'error', 'invalid',
      'unauthorized', 'noaccess', 'accessdenied'
    ];

    step.apiStatus = known.includes(status)
      ? status
      : 'unknown';

    if (status !== 'ok') {
      throw new Error(
        `API_${step.apiStatus.toUpperCase()}`
      );
    }

    return body.response;
  } catch (error) {
    const code = error?.message;
    if (
      /^(HTTP_\d{3}|API_[A-Z]+|INVALID_JSON)$/.test(code)
    ) {
      throw error;
    }

    throw new Error(
      controller.signal.aborted
        ? 'TIMEOUT'
        : 'NETWORK_ERROR'
    );
  } finally {
    clearTimeout(timer);
  }
}

function items(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) {
    return response.items;
  }
  throw new Error('UNEXPECTED_RESPONSE_SHAPE');
}

async function main() {
  log('test', 'COMPLETED_CRICKET_DEMO');

  if (!token) {
    throw new Error('MISSING_ENTITYSPORT_API_TOKEN');
  }

  const competitions = items(await get('competitions', {
    status: 'result',
    per_page: '5',
    paged: '1'
  }));

  log('competitionsReturned', competitions.length);

  const competition = competitions.find(c =>
    /^\d+$/.test(String(c.cid)) &&
    ['result', '2'].includes(
      String(c.status).toLowerCase()
    )
  );

  if (!competition) {
    log('result', 'NO_COMPLETED_COMPETITION_IN_FIRST_PAGE');
    return;
  }

  log('competition', {
    cid: competition.cid,
    title: competition.title,
    season: competition.season,
    status: competition.status
  });

  const matches = items(await get(
    `competitions/${competition.cid}/matches`,
    {
      status: '2',
      per_page: '5',
      paged: '1'
    }
  ));

  const completed = matches.filter(
    m => String(m.status) === '2'
  );

  log('matchesReturned', matches.length);

  log('completedMatches', completed.slice(0, 3).map(m => ({
    matchId: m.match_id ?? m.mid,
    title: m.title,
    date: m.date_start,
    status: m.status,
    statusNote: m.status_note,
    teamA: {
      name: m.teama?.name,
      scores: m.teama?.scores,
      overs: m.teama?.overs
    },
    teamB: {
      name: m.teamb?.name,
      scores: m.teamb?.scores,
      overs: m.teamb?.overs
    }
  })));

  log('result', completed.length
    ? 'COMPLETED_MATCH_DATA_RETURNED'
    : 'NO_COMPLETED_MATCH_IN_CHECKED_PAGE'
  );
}

try {
  await main();
} catch (error) {
  log('result', 'TEST_STOPPED');
  log('reason', error.message);
} finally {
  log('requestsSent', requestsSent);
  log('steps', steps);
  log(
    'scope',
    'Historical demo only. Live odds, fancy, back/lay, suspension timing and website integration are not verified.'
  );
}
