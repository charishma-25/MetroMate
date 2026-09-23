import { useEffect, useState } from "react";
import "./App.css";
const redLine = [
  "Miyapur", "JNTU College", "KPHB Colony", "Kukatpally", "Balanagar",
  "Moosapet", "Bharat Nagar", "Erragadda", "ESI Hospital", "SR Nagar",
  "Ameerpet", "Irrum Manzil", "Khairatabad", "Lakdi Ka Pul", "Assembly",
  "Nampally", "Gandhi Bhavan", "Osmania Medical College", "MG Bus Station",
  "Malakpet", "New Market", "Musarambagh", "Dilsukhnagar", "Chaitanyapuri",
  "Victoria Memorial", "LB Nagar"
];

const blueLine = [
  "Nagole", "Uppal", "Stadium", "NGRI", "Habsiguda", "Tarnaka",
  "Mettuguda", "Secunderabad East", "Parade Ground", "Paradise",
  "Rasoolpura", "Prakash Nagar", "Begumpet", "Ameerpet", "Madhura Nagar",
  "Yusufguda", "Jubilee Hills Road No 5", "Jubilee Hills Check Post",
  "Peddamma Temple", "Madhapur", "Durgam Cheruvu", "HITEC City", "Raidurg"
];

const greenLine = [
  "JBS Parade Ground", "Secunderabad West", "Gandhi Hospital", "Musheerabad",
  "RTC X Roads", "Chikkadpally", "Narayanguda", "Sultan Bazar", "MGBS"
];

const metroStations = [...new Set([...redLine, ...blueLine, ...greenLine])];

const stationCoordinates = {
  Miyapur: { lat: 17.4967, lng: 78.3731 },
  "JNTU College": { lat: 17.4987, lng: 78.3915 },
  "KPHB Colony": { lat: 17.4948, lng: 78.4036 },
  Kukatpally: { lat: 17.4858, lng: 78.4118 },
  Balanagar: { lat: 17.4691, lng: 78.4443 },
  Ameerpet: { lat: 17.4375, lng: 78.4482 },
  "Jubilee Hills Check Post": { lat: 17.4307, lng: 78.4138 },
  Raidurg: { lat: 17.4239, lng: 78.4013 },
  Nagole: { lat: 17.3917, lng: 78.5583 },
  MGBS: { lat: 17.3799, lng: 78.4887 }
};

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getStationName(input) {
  const typed = normalize(input);
  return (
    metroStations.find((s) => normalize(s) === typed) ||
    metroStations.find((s) => normalize(s).includes(typed) || typed.includes(normalize(s))) ||
    input
  );
}

function buildGraph() {
  const graph = {};

  function addEdge(a, b, line) {
    if (!graph[a]) graph[a] = [];
    if (!graph[b]) graph[b] = [];
    graph[a].push({ station: b, line });
    graph[b].push({ station: a, line });
  }

  for (let i = 0; i < redLine.length - 1; i++) addEdge(redLine[i], redLine[i + 1], "Red");
  for (let i = 0; i < blueLine.length - 1; i++) addEdge(blueLine[i], blueLine[i + 1], "Blue");
  for (let i = 0; i < greenLine.length - 1; i++) addEdge(greenLine[i], greenLine[i + 1], "Green");

  addEdge("Parade Ground", "JBS Parade Ground", "Interchange");
  addEdge("MG Bus Station", "MGBS", "Interchange");

  return graph;
}

function findRoute(source, destination) {
  const graph = buildGraph();
  const start = getStationName(source);
  const end = getStationName(destination);

  const queue = [{ station: start, path: [start], lines: [] }];
  const visited = new Set([start]);

  while (queue.length > 0) {
    const current = queue.shift();

    if (current.station === end) return { path: current.path, lines: current.lines };

    for (const next of graph[current.station] || []) {
      if (!visited.has(next.station)) {
        visited.add(next.station);
        queue.push({
          station: next.station,
          path: [...current.path, next.station],
          lines: [...current.lines, next.line]
        });
      }
    }
  }

  return { path: [start, end], lines: [] };
}

function getDistance(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return earthRadius * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function hasInterchange(lines) {
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] !== lines[i - 1]) return true;
  }
  return false;
}

export default function App() {
  const [source, setSource] = useState("Miyapur");
  const [destination, setDestination] = useState("Raidurg");
  const [language, setLanguage] = useState("en-US");
  const [showRoute, setShowRoute] = useState(false);
  const [routeData, setRouteData] = useState({ path: [], lines: [] });
  const [nearestStation, setNearestStation] = useState("Detecting your location...");

  const [manualMode, setManualMode] = useState(false);
  const [manualIndex, setManualIndex] = useState(0);
  const [manualMessage, setManualMessage] = useState("");
  const [showDestinationAlert, setShowDestinationAlert] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setNearestStation("Location is not supported on this browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        let closestStation = "";
        let closestDistance = Infinity;

        Object.keys(stationCoordinates).forEach((station) => {
          const coords = stationCoordinates[station];
          const distance = getDistance(userLat, userLng, coords.lat, coords.lng);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestStation = station;
          }
        });

        setNearestStation(`${closestStation} (${closestDistance.toFixed(2)} km away)`);
      },
      () => setNearestStation("Location permission denied")
    );
  }, []);

  function playRingSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    for (let i = 0; i < 3; i++) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(900, audioContext.currentTime + i * 0.35);

      gain.gain.setValueAtTime(0.25, audioContext.currentTime + i * 0.35);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + i * 0.35 + 0.25);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start(audioContext.currentTime + i * 0.35);
      oscillator.stop(audioContext.currentTime + i * 0.35 + 0.25);
    }
  }

  function speak(text) {
    window.speechSynthesis.cancel();
    const voice = new SpeechSynthesisUtterance(text);
    voice.lang = language;
    voice.rate = 0.95;
    window.speechSynthesis.speak(voice);
  }

  function getRoute() {
    const newRoute = findRoute(source, destination);
    setRouteData(newRoute);
    setShowRoute(true);
    setManualMode(false);
    setManualIndex(0);
    setManualMessage("");
    setShowDestinationAlert(false);
    speak(`Your route from ${getStationName(source)} to ${getStationName(destination)} is ready.`);
  }

  function startTrip() {
    if (routeData.path.length > 1) {
      speak(`Trip started. MetroMate will guide you. Your next station is ${routeData.path[1]}.`);
    } else {
      speak("Please get your route first.");
    }
  }

  function speakInterchange() {
    for (let i = 1; i < routeData.lines.length; i++) {
      if (routeData.lines[i] !== routeData.lines[i - 1]) {
        speak(`Get down at ${routeData.path[i]} and change from ${routeData.lines[i - 1]} Line to ${routeData.lines[i]} Line.`);
        return;
      }
    }
  }

  function startManualMode() {
    if (routeData.path.length <= 1) {
      speak("Please get your route first.");
      return;
    }

    setManualMode(true);
    setManualIndex(0);
    setShowDestinationAlert(false);

    const message = `Manual mode started. You are at ${routeData.path[0]}. Next station is ${routeData.path[1]}. ${routeData.path.length - 2} stations left after next station.`;
    setManualMessage(message);
    speak(message);
  }

  function nextManualStation() {
    if (!manualMode || routeData.path.length <= 1) return;

    const nextIndex = manualIndex + 1;

    if (nextIndex >= routeData.path.length - 1) {
      const message = `You have reached your final destination, ${routeData.path[routeData.path.length - 1]}. Please get down here.`;
      setManualIndex(routeData.path.length - 1);
      setManualMessage(message);
      setShowDestinationAlert(false);
      speak(message);
      return;
    }

    const currentStation = routeData.path[nextIndex];
    const nextStation = routeData.path[nextIndex + 1];
    const stationsLeft = routeData.path.length - 1 - nextIndex;

    const currentLine = routeData.lines[nextIndex];
    const previousLine = routeData.lines[nextIndex - 1];

    let message = `You are now at ${currentStation}. ${stationsLeft} stations left. Next station is ${nextStation}.`;

    if (previousLine && currentLine !== previousLine) {
      message = `You are at ${currentStation}. Interchange here. Change from ${previousLine} Line to ${currentLine} Line. Next station is ${nextStation}. ${stationsLeft} stations left.`;
    }

    if (stationsLeft === 1) {
      message = `Alert! Your destination ${routeData.path[routeData.path.length - 1]} is the next station. Please be ready to get down.`;
      setShowDestinationAlert(true);
      playRingSound();
    }

    setManualIndex(nextIndex);
    setManualMessage(message);
    speak(message);
  }

  return (
    <div className="app">
      {showDestinationAlert && (
        <div
          style={{
            position: "fixed",
            top: "25px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            width: "min(520px, 90%)",
            background: "linear-gradient(135deg, #ff4d4d, #ffcc00)",
            color: "#06111f",
            padding: "20px",
            borderRadius: "20px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
            textAlign: "center",
            fontWeight: "800"
          }}
        >
          🔔 Destination Alert
          <p style={{ margin: "8px 0 14px", color: "#06111f" }}>
            Your destination is the next station. Please be ready to get down.
          </p>
          <button onClick={() => setShowDestinationAlert(false)}>OK</button>
        </div>
      )}

      <section className="hero">
        <div>
          <p className="tag">Smart Metro Navigation Assistant</p>
          <h1>🚇 MetroMate</h1>
          <p>A voice-guided metro app for first-time passengers and people who may miss their stops.</p>
          <p><strong>📍 Nearby Metro Station:</strong> {nearestStation}</p>
        </div>
        <span className="pill">Ready</span>
      </section>

      <section className="card">
        <h2>Plan Your Journey</h2>

        <div className="grid">
          <div>
            <label>Preferred Voice Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="en-US">English</option>
            </select>
          </div>

          <div>
            <label>Source Station</label>
            <input list="source-stations" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Type source station" />
            <datalist id="source-stations">
              {metroStations.map((station) => <option key={station} value={station} />)}
            </datalist>
          </div>

          <div>
            <label>Destination Station</label>
            <input list="destination-stations" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Type destination station" />
            <datalist id="destination-stations">
              {metroStations.map((station) => <option key={station} value={station} />)}
            </datalist>
          </div>
        </div>

        <div className="buttons">
          <button onClick={getRoute}>Get Route</button>
          <button onClick={startTrip}>Start Trip</button>
          <button onClick={startManualMode}>Manual Mode</button>

          {showRoute && hasInterchange(routeData.lines) && (
            <button onClick={speakInterchange}>Test Interchange Voice</button>
          )}
        </div>
      </section>

      {manualMode && (
        <section className="card">
          <h2>Manual Mode Guidance</h2>
          <div className="summary">
            <div>
              <span>Current Station</span>
              <strong>{routeData.path[manualIndex]}</strong>
            </div>
            <div>
              <span>Next Station</span>
              <strong>{routeData.path[manualIndex + 1] || "Destination reached"}</strong>
            </div>
            <div>
              <span>Stations Left</span>
              <strong>{Math.max(0, routeData.path.length - 1 - manualIndex)}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{manualIndex >= routeData.path.length - 1 ? "Reached" : "On Trip"}</strong>
            </div>
          </div>

          <div className="voice">
            <h3>🔔 Live Manual Alert</h3>
            <p>{manualMessage}</p>
          </div>

          <div className="buttons">
            <button onClick={nextManualStation}>Next Station</button>
          </div>
        </section>
      )}

      {showRoute && (
        <section className="card">
          <h2>Route Summary</h2>

          <div className="summary">
            <div><span>From</span><strong>{getStationName(source)}</strong></div>
            <div><span>To</span><strong>{getStationName(destination)}</strong></div>
            <div><span>Total Stops</span><strong>{Math.max(0, routeData.path.length - 1)}</strong></div>
            <div><span>Estimated Time</span><strong>{Math.max(0, routeData.path.length - 1) * 2} min</strong></div>
          </div>

          <div className="voice">
            <h3>🔊 Voice Assistant</h3>
            <p>MetroMate announces your next station, destination alert, and interchange instructions.</p>
          </div>

          <h3>Station-by-Station Guidance</h3>

          <div className="steps">
            {routeData.path.slice(0, -1).map((station, index) => {
              const nextStation = routeData.path[index + 1];
              const currentLine = routeData.lines[index];
              const previousLine = routeData.lines[index - 1];

              return (
                <div className="step" key={`${station}-${nextStation}`}>
                  <div className="number">{index + 1}</div>
                  <div>
                    <strong>{station} → {nextStation}</strong>
                    <p>
                      {previousLine && currentLine !== previousLine
                        ? `Get down at ${station} and change from ${previousLine} Line to ${currentLine} Line.`
                        : `Next station is ${nextStation}. Continue on the ${currentLine} Line.`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}