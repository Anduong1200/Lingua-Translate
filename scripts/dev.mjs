import { spawn } from 'node:child_process'

const isWindows = process.platform === 'win32'
const npmCommand = isWindows ? 'npm.cmd' : 'npm'
const pythonCommand = process.env.PYTHON_BIN || (isWindows ? 'python' : 'python3')
const frontendArgs = process.argv.slice(2)

const children = [
  spawn(pythonCommand, ['-m', 'uvicorn', 'main:app', '--app-dir', 'backend', '--host', '127.0.0.1', '--port', '3001'], {
    stdio: 'inherit',
    env: process.env,
    shell: isWindows,
  }),
  spawn(npmCommand, ['run', 'dev:frontend', '--', ...frontendArgs], {
    stdio: 'inherit',
    env: process.env,
    shell: isWindows,
  }),
]

let shuttingDown = false
function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    if (!child.killed) child.kill()
  }
  process.exit(code)
}

for (const child of children) {
  child.on('exit', (code) => {
    if (!shuttingDown && code && code !== 0) {
      shutdown(code)
    }
  })
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
