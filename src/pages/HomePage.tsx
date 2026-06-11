import { useEffect, useState } from "react";
import { Panel } from "@/components/Panel";
import { architectureTracks, milestonePlan, mvpFeatures } from "@/constants/projectPlan";
import { loadBrandCodeMap, summarizeBrandCoverage } from "@/core/palette/brandCodeMap";
import type { BrandCodeMap, BrandCoverageSummary } from "@/types/palette";

export function HomePage() {
  const [map, setMap] = useState<BrandCodeMap | null>(null);
  const [coverage, setCoverage] = useState<BrandCoverageSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    loadBrandCodeMap()
      .then((loadedMap) => {
        if (!active) {
          return;
        }

        setMap(loadedMap);
        setCoverage(summarizeBrandCoverage(loadedMap));
      })
      .catch((loadError: unknown) => {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unknown palette loading error");
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="shell">
      <div className="layout">
        <div className="stack">
          <section className="panel hero">
            <span className="eyebrow">BeadGrid / MVP kickoff</span>
            <h1>拼豆底稿生成器的第一阶段已经落地。</h1>
            <p className="lede">
              当前版本先把项目骨架、色号映射数据入口、颜色数学基座和测试回路建起来。这样后续接图片采样、
              Worker 管线、品牌匹配和导出时，不需要推翻结构。
            </p>
            <div className="pill-row">
              <div className="pill">
                <strong>{map?.rows.length ?? "--"}</strong>
                <span>已接入的映射行数</span>
              </div>
              <div className="pill">
                <strong>5</strong>
                <span>当前识别到的品牌列</span>
              </div>
              <div className="pill">
                <strong className="status-warn">RGB 待补齐</strong>
                <span>现有 CSV 只是跨品牌色号映射表</span>
              </div>
            </div>
          </section>

          <Panel title="MVP 功能清单" eyebrow="Scope">
            <ul className="bullet-list">
              {mvpFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </Panel>

          <Panel title="项目结构与职责" eyebrow="Architecture">
            <div className="code-grid">
              {architectureTracks.map((track) => (
                <article key={track.label} className="code-card">
                  <strong>{track.label}</strong>
                  <code>{track.code}</code>
                </article>
              ))}
            </div>
          </Panel>
        </div>

        <div className="stack">
          <Panel title="数据接入状态" eyebrow="Palette seed">
            {error ? <div className="error-box">{error}</div> : null}
            <div className="metric-grid">
              <div className="metric">
                <strong>{map?.brands.length ?? "--"}</strong>
                <span>品牌列</span>
              </div>
              <div className="metric">
                <strong>{map?.rows.length ?? "--"}</strong>
                <span>标准色号行</span>
              </div>
              <div className="metric">
                <strong className="status-warn">缺 RGB</strong>
                <span>不能直接做生产级匹配</span>
              </div>
            </div>
            <div className="table-wrap" style={{ marginTop: "14px" }}>
              {coverage.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>品牌</th>
                      <th>已映射</th>
                      <th>缺失</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coverage.map((item) => (
                      <tr key={item.brandId}>
                        <td>{item.nameZh}</td>
                        <td>{item.mappedRows}</td>
                        <td>{item.missingRows}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty">正在读取品牌映射数据。</div>
              )}
            </div>
          </Panel>

          <Panel title="里程碑计划" eyebrow="Roadmap">
            <ol className="milestone-list">
              {milestonePlan.map((item) => (
                <li key={item.title} className="milestone-item">
                  <strong>{item.title}</strong>
                  <span className="muted">{item.detail}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </main>
  );
}

