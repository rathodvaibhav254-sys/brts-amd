import React from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function AnalyticsPanel({ buses }) {
  // ── 1. Speed Distribution calculations
  // Ranges: 0-10, 10-20, 20-30, 30-40, 40-50, 50+
  const speedRanges = [0, 0, 0, 0, 0, 0];
  buses.forEach((bus) => {
    const s = bus.speed || 0;
    if (s < 10) speedRanges[0]++;
    else if (s < 20) speedRanges[1]++;
    else if (s < 30) speedRanges[2]++;
    else if (s < 40) speedRanges[3]++;
    else if (s < 50) speedRanges[4]++;
    else speedRanges[5]++;
  });

  const speedChartData = {
    labels: ["0-10", "10-20", "20-30", "30-40", "40-50", "50+"],
    datasets: [
      {
        label: "Buses",
        data: speedRanges,
        backgroundColor: "rgba(0, 212, 255, 0.25)",
        borderColor: "rgba(0, 212, 255, 0.85)",
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  // ── 2. Crowd levels calculations
  let low = 0, medium = 0, high = 0;
  buses.forEach((bus) => {
    const crowd = bus.crowd || "low";
    if (crowd === "high") high++;
    else if (crowd === "medium") medium++;
    else low++;
  });

  const crowdChartData = {
    labels: ["Low Load", "Medium Load", "High Load"],
    datasets: [
      {
        data: [low, medium, high],
        backgroundColor: [
          "rgba(0, 245, 160, 0.7)",
          "rgba(255, 209, 102, 0.7)",
          "rgba(255, 51, 85, 0.7)",
        ],
        borderColor: "rgba(2, 8, 19, 0.9)",
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };

  // ── 3. Common Options
  const tooltipStyle = {
    backgroundColor: "rgba(5, 10, 22, 0.95)",
    borderColor: "rgba(0, 212, 255, 0.2)",
    borderWidth: 1,
    titleColor: "#eef4fc",
    bodyColor: "#8aadcc",
    padding: 10,
    cornerRadius: 8,
    titleFont: { family: "'Space Grotesk', sans-serif" },
    bodyFont: { family: "'JetBrains Mono', monospace" },
  };

  const speedOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: tooltipStyle,
    },
    scales: {
      x: {
        grid: { color: "rgba(255, 255, 255, 0.04)" },
        ticks: { color: "#7a9bba", font: { family: "'JetBrains Mono'", size: 10 } },
      },
      y: {
        grid: { color: "rgba(255, 255, 255, 0.04)" },
        ticks: { color: "#7a9bba", font: { family: "'JetBrains Mono'", size: 10 }, stepSize: 1 },
        beginAtZero: true,
      },
    },
  };

  const crowdOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          color: "#7a9bba",
          font: { family: "'Space Grotesk'", size: 11 },
          padding: 14,
          boxWidth: 8,
          borderRadius: 2,
        },
      },
      tooltip: tooltipStyle,
    },
  };

  return (
    <div className="analytics-grid">
      <div className="panel panel-chart">
        <div className="panel-header">
          <span className="panel-title">
            <div className="panel-title-icon">📊</div>
            SPEED DISTRIBUTION
          </span>
        </div>
        <div className="chart-wrap" style={{ height: "200px", position: "relative" }}>
          {buses.length > 0 ? (
            <Bar data={speedChartData} options={speedOptions} />
          ) : (
            <div className="empty-state">Calculating metrics...</div>
          )}
        </div>
      </div>

      <div className="panel panel-chart">
        <div className="panel-header">
          <span className="panel-title">
            <div className="panel-title-icon">👥</div>
            PASSENGER LOAD DENSITY
          </span>
        </div>
        <div className="chart-wrap" style={{ height: "200px", position: "relative" }}>
          {buses.length > 0 ? (
            <Doughnut data={crowdChartData} options={crowdOptions} />
          ) : (
            <div className="empty-state">Analyzing load factors...</div>
          )}
        </div>
      </div>
    </div>
  );
}
