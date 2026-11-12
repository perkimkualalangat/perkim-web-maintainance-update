import { useState, useCallback } from 'react';
import { useDevApi } from './useDevApi.js';

export function useTerminal() {
  const { runCommand } = useDevApi();
  const [buildLog, setBuildLog] = useState('');
  const [testLog, setTestLog] = useState('');
  const [doctorLog, setDoctorLog] = useState('');
  const [runningCmd, setRunningCmd] = useState(null);
  const [customCmd, setCustomCmd] = useState('');
  const [activeLogTab, setActiveLogTab] = useState('build');

  const runAndLog = useCallback(async (cmd, setLogFn) => {
    setRunningCmd(cmd);
    setLogFn(prev => `${prev}$ ${cmd}\n`);
    try {
      const result = await runCommand(cmd);
      setLogFn(prev => 
        prev + result.stdout + 
        (result.stderr ? `\n[stderr]\n${result.stderr}` : '') + 
        `\n[exit: ${result.code}]\n`
      );
    } catch (e) {
      setLogFn(prev => `${prev}\n❌ ${e.message}\n`);
    } finally {
      setRunningCmd(null);
    }
  }, [runCommand]);

  const runBuild = useCallback(() => runAndLog('npm run build', setBuildLog), [runAndLog]);
  const runTest = useCallback(() => runAndLog('npm run test', setTestLog), [runAndLog]);
  const runDoctor = useCallback(() => runAndLog('npm run doctor', setDoctorLog), [runAndLog]);
  const runGitStatus = useCallback(() => runAndLog('git status', setBuildLog), [runAndLog]);
  const runCustom = useCallback(() => runAndLog(customCmd, setBuildLog), [runAndLog, customCmd]);

  const clearLog = useCallback((which) => {
    if (which === 'build') setBuildLog('');
    else if (which === 'test') setTestLog('');
    else if (which === 'doctor') setDoctorLog('');
  }, []);

  return {
    // State
    buildLog,
    testLog,
    doctorLog,
    runningCmd,
    customCmd,
    activeLogTab,
    // Actions
    setCustomCmd,
    setActiveLogTab,
    runBuild,
    runTest,
    runDoctor,
    runGitStatus,
    runCustom,
    clearLog,
    setBuildLog,
    setTestLog,
    setDoctorLog,
  };
}