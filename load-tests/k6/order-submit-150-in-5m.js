import { check, fail, sleep } from "k6";
import exec from "k6/execution";
import http from "k6/http";
import { Counter, Rate } from "k6/metrics";

const submitSuccess = new Rate("order_submit_success");
const submitAttempts = new Counter("order_submit_attempts");

const baseUrl = (__ENV.BASE_URL || "").replace(/\/+$/, "");
const password = __ENV.PASSWORD || "";
const userCount = parseInt(__ENV.USER_COUNT || "150", 10);
const maxSubmits = parseInt(__ENV.MAX_SUBMITS || String(userCount), 10);
const userStartIndex = parseInt(__ENV.USER_START_INDEX || "1", 10);
const userEmailPrefix = __ENV.USER_EMAIL_PREFIX || "zp-loadtest-";
const userEmailDomain = __ENV.USER_EMAIL_DOMAIN || "loadtest.local";
const orderDate = __ENV.ORDER_DATE || nextWeekdayIso(7);
const includePlannedRead = (__ENV.INCLUDE_PLANNED_READ || "true") !== "false";
const arrivalRate = parseInt(__ENV.RATE || "30", 10);
const duration = __ENV.DURATION || "5m";
const preAllocatedVUs = parseInt(__ENV.PRE_ALLOCATED_VUS || "30", 10);
const maxVUs = parseInt(__ENV.MAX_VUS || "150", 10);

if (!baseUrl) {
  fail("BASE_URL is required, e.g. BASE_URL=https://zdravyprojekt.example");
}
if (!password) {
  fail("PASSWORD is required and must match seed_load_test_users --password.");
}
if (!Number.isInteger(userCount) || userCount < 1) {
  fail("USER_COUNT must be a positive integer.");
}
if (!Number.isInteger(maxSubmits) || maxSubmits < 1) {
  fail("MAX_SUBMITS must be a positive integer.");
}
if (!Number.isInteger(arrivalRate) || arrivalRate < 1) {
  fail("RATE must be a positive integer.");
}
if (!Number.isInteger(preAllocatedVUs) || preAllocatedVUs < 1) {
  fail("PRE_ALLOCATED_VUS must be a positive integer.");
}
if (!Number.isInteger(maxVUs) || maxVUs < preAllocatedVUs) {
  fail("MAX_VUS must be greater than or equal to PRE_ALLOCATED_VUS.");
}

export const options = {
  scenarios: {
    order_submits: {
      executor: "constant-arrival-rate",
      rate: arrivalRate,
      timeUnit: "1m",
      duration,
      preAllocatedVUs,
      maxVUs,
    },
  },
  thresholds: {
    checks: ["rate>0.99"],
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<3000", "p(99)<6000"],
    order_submit_success: ["rate>0.99"],
  },
};

export default function () {
  if (exec.scenario.iterationInTest >= maxSubmits) {
    return;
  }

  const userIndex = userStartIndex + (exec.scenario.iterationInTest % userCount);
  const email = (
    `${userEmailPrefix}${String(userIndex).padStart(3, "0")}@${userEmailDomain}`
  ).toLowerCase();

  const loginResponse = http.post(
    `${baseUrl}/api/token/`,
    JSON.stringify({ email, password }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { name: "POST /api/token/" },
    },
  );

  const loggedIn = check(loginResponse, {
    "login returned 200": (response) => response.status === 200,
    "login returned access token": (response) => Boolean(response.json("access")),
  });
  if (!loggedIn) {
    submitSuccess.add(false);
    return;
  }

  const headers = {
    Authorization: `Bearer ${loginResponse.json("access")}`,
    "Content-Type": "application/json",
  };

  if (includePlannedRead) {
    const plannedResponse = http.get(`${baseUrl}/api/orders/planned/`, {
      headers,
      tags: { name: "GET /api/orders/planned/" },
    });
    check(plannedResponse, {
      "planned orders returned 200": (response) => response.status === 200,
    });
  }

  submitAttempts.add(1);
  const orderResponse = http.post(
    `${baseUrl}/api/orders/`,
    JSON.stringify(buildOrderPayload(userIndex)),
    {
      headers,
      tags: { name: "POST /api/orders/" },
    },
  );

  const submitted = check(orderResponse, {
    "order submit returned 200/201": (response) =>
      response.status === 200 || response.status === 201,
    "order response has target date": (response) => response.json("date") === orderDate,
  });
  submitSuccess.add(submitted);

  sleep(Math.random() * 2);
}

function buildOrderPayload(userIndex) {
  const lunchA = 1 + (userIndex % 4);
  const lunchB = userIndex % 3 === 0 ? 1 : 0;

  return {
    date: orderDate,
    status: "submitted",
    data: {
      breakfast: {
        "Dospelý (SŠ)": {
          menuCounts: { A: 1 },
          diets: {},
        },
      },
      lunch: {
        "Dospelý (SŠ)": {
          menuCounts: lunchB > 0 ? { A: lunchA, B: lunchB } : { A: lunchA },
          diets: {},
        },
      },
      olovrant: {
        "Dospelý (SŠ)": {
          menuCounts: { A: 1 },
          diets: {},
        },
      },
    },
  };
}

function nextWeekdayIso(daysAhead) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }
  return date.toISOString().slice(0, 10);
}
