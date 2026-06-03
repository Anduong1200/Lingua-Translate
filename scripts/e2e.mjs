import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const tmpDir = resolve(rootDir, '.tmp')
mkdirSync(tmpDir, { recursive: true })

const env = {
  ...process.env,
  TEMP: tmpDir,
  TMP: tmpDir,
  E2E_FRONTEND_PORT: process.env.E2E_FRONTEND_PORT || '3000',
}

if (!/\b--max-old-space-size=/.test(env.NODE_OPTIONS || '')) {
  env.NODE_OPTIONS = `${env.NODE_OPTIONS || ''} --max-old-space-size=4096`.trim()
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'

function run(command, args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      env,
      stdio: 'inherit',
      shell: true,
    })

    child.on('exit', (code) => {
      if (code === 0) resolveRun()
      else rejectRun(new Error(`${command} ${args.join(' ')} exited with ${code}`))
    })
    child.on('error', rejectRun)
  })
}

const passthroughArgs = process.argv.slice(2)

function stopFrontendPort() {
  if (process.env.E2E_SKIP_PORT_CLEANUP === '1') return
  const port = env.E2E_FRONTEND_PORT
  const pids = new Set()

  if (process.platform === 'win32') {
    const result = spawnSync('netstat', ['-ano', '-p', 'TCP'], { encoding: 'utf8' })
    for (const line of (result.stdout || '').split(/\r?\n/)) {
      const parts = line.trim().split(/\s+/)
      if (parts.length < 5) continue
      const [protocol, localAddress, , state, pid] = parts
      if (protocol !== 'TCP' || state !== 'LISTENING') continue
      if (localAddress.endsWith(`:${port}`)) pids.add(pid)
    }
    for (const pid of pids) {
      spawnSync('taskkill', ['/PID', pid, '/F'], { stdio: 'ignore' })
    }
    return
  }

  const result = spawnSync('lsof', ['-ti', `tcp:${port}`], { encoding: 'utf8' })
  for (const pid of (result.stdout || '').split(/\s+/).filter(Boolean)) {
    try {
      process.kill(Number(pid), 'SIGTERM')
    } catch {
      // Ignore stale process ids.
    }
  }
}

try {
  stopFrontendPort()
  await run(npmCommand, ['run', 'build'])
  await run(npxCommand, ['playwright', 'test', '--workers=1', ...passthroughArgs])
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
