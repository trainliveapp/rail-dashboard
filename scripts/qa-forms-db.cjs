const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const bin = process.env.PG_BIN
if (!bin) throw Error('Set PG_BIN to an installed PostgreSQL bin directory.')
const data = path.resolve(process.env.QA_PG_DATA || 'tmp/qa-postgres')
fs.mkdirSync('tmp', { recursive: true })
const run = (name, args, options = {}) => {
  const result = spawnSync(path.join(bin, name + '.exe'), args, { stdio: 'inherit', windowsHide: true, ...options })
  if (result.status !== 0) throw Error(`${name} exited with ${result.status}`)
}
if (!fs.existsSync(path.join(data, 'PG_VERSION'))) run('initdb', ['-D', data, '-A', 'trust', '-U', 'qa', '--no-locale', '-E', 'UTF8'])
let started = false
try {
  run('pg_ctl', ['-D', data, '-l', path.resolve('tmp/qa-postgres.log'), '-o', '-p 15439 -h 127.0.0.1', '-w', 'start'])
  started = true
  const test = spawnSync(process.execPath, ['--test', process.argv.includes('--all') ? 'tests/*.test.js' : 'tests/publicFormsDatabase.test.js'], { stdio: 'inherit', windowsHide: true, env: { ...process.env, PUBLIC_FORMS_TEST_PSQL: path.join(bin, 'psql.exe'), PGHOST: '127.0.0.1', PGPORT: '15439', PGUSER: 'qa', PGDATABASE: 'postgres' } })
  process.exitCode = test.status || 0
} finally { if (started) run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']) }
