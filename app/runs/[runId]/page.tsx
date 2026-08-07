// app/runs/[runId]/page.tsx 内の fetchLatestData 関数部分
const fetchLatestData = useCallback((retryCount = 0) => {
  fetch(`/api/test-run?runId=${runId}&t=${Date.now()}`, { cache: 'no-store' })
    .then((res) => res.json())
    .then((data) => {
      if (data && !data.error) {
        setRunData(data);
        setLoading(false);
      } else if (retryCount < 5) {
        // GitHub側の反映待ちのため 1.5秒後にリトライ
        setTimeout(() => fetchLatestData(retryCount + 1), 1500);
      } else {
        setRunData(data);
        setLoading(false);
      }
    })
    .catch((err) => {
      if (retryCount < 5) {
        setTimeout(() => fetchLatestData(retryCount + 1), 1500);
      } else {
        setLoading(false);
      }
    });
}, [runId]);