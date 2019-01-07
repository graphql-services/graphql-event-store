import fetch, { RequestInit } from 'node-fetch';
import { readFileSync } from 'fs';

const URL = `https://api.abdent.novacloud.app/graphql`;

const createEntity = async (variables: any) => {
  const query = `mutation createJobClassification($input: JobClassificationRawCreateInput!) { createJobClassification(input:$input) {id} }`;
  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      "authorization":
        'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiMmU1Njc5OGYtZDM5Ni00MGJkLWEwYjAtYjM2YjBiYmYzMjJmIiwidXNlcm5hbWUiOiJqYWt1Yi5rbmVqemxpa0Bub3ZhY2xvdWQuY3oiLCJwZXJtaXNzaW9ucyI6ImFsbG93fCoiLCJtZXRhZGF0YSI6InVuZGVmaW5lZCJ9LCJpYXQiOjE1NDI3MDIzODgsInN1YiI6IjJlNTY3OThmLWQzOTYtNDBiZC1hMGIwLWIzNmIwYmJmMzIyZiJ9.hrULroOSawvZkCEXq_s9lgEYVkLqVQMpLxqOIEBA5sHFMB5DwCLNWQwZynJWY8C2ZZ_R0wv3CHP3XkxzAwuRTYcDnwYIhcVOBfRlTjF0s_dMkDxhrAr5-LDbCoeqzeZZKdHTCerLsdYyXYx9PAUAyyHvuhQ97wPCuAZNS69Jyns',
    },
    body: JSON.stringify({ query, variables }),
  });
  global.console.log(await res.json());
  if (res.status >= 300 || res.status < 200) {
    const body = await res.text();
    throw new Error(
      `unexpected status code from forwarder (url: ${URL}, status: ${
        res.status
      }, body: ${body})`,
    );
  }
};

const run = async () => {
  const data = readFileSync(__dirname + '/job-classifications.csv', 'utf-8');
  const lines = data.split('\n').slice(1);
  for (const line of lines) {
    const [code, name] = line.split(';');
    await createEntity({ input: { code, name } });
    global.console.log('created line', line);
  }
};

run();
