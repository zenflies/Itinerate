import sys
import os
import re
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from flask import Flask, request, jsonify
from chromadb_document_processor.flights_crew import FlightsCrew
from dotenv import load_dotenv
import json
load_dotenv()


def _extract_json(text: str) -> dict | None:
    """Extract a JSON object from raw text, handling markdown code fences."""
    text = text.strip()
    # Strip markdown code fences
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    try:
        return json.loads(text)
    except Exception:
        pass
    # Fall back: find the outermost {...} block
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass
    return None

app = Flask(__name__)


FLIGHT_KEYWORDS = {"fly", "flight", "flights", "airline", "airlines", "airport", "one-way", "round trip", "round-trip"}

def is_flight_query(text: str) -> bool:
    lower = text.lower()
    return any(kw in lower for kw in FLIGHT_KEYWORDS)

HTML = """
<!DOCTYPE html>
<html>
<head><title>Vector DB</title></head>
<body>
  <h2>Save text to vector database</h2>
  <textarea id="text" rows="4" cols="50" placeholder="Enter text..."></textarea><br><br>
  <button onclick="save()">Save</button>
  <p id="status"></p>
  <pre id="result" style="white-space:pre-wrap;max-width:600px;"></pre>
  <script>
    async function save() {
      const text = document.getElementById("text").value.trim();
      const res = await fetch("/save", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({text})
      });
      const data = await res.json();
      document.getElementById("status").textContent = data.message;
      document.getElementById("result").textContent = data.crew_result || "";
      document.getElementById("text").value = "";
    }
  </script>
</body>
</html>
"""

@app.route("/")
def index():
    return HTML

@app.route("/flights", methods=["POST"])
def flights():
    """Structured flight search endpoint for the Express proxy."""
    query = request.json.get("query", "").strip()
    if not query:
        return jsonify({"error": "No query provided.", "flights": [], "return_flights": []}), 400
    try:
        result = FlightsCrew().crew().kickoff(inputs={"query": query})
        # Prefer json_dict (Pydantic-validated), fall back to raw text
        flight_data = result.json_dict or _extract_json(result.raw or "")
        if not flight_data:
            flight_data = {"flights": [], "return_flights": []}
        # Always ensure both keys are present
        flight_data.setdefault("flights", [])
        flight_data.setdefault("return_flights", [])
        return jsonify(flight_data)
    except Exception as e:
        return jsonify({"error": str(e), "flights": [], "return_flights": []}), 500


@app.route("/save", methods=["POST"])
def save():
    query = request.json.get("text", "").strip()

    if not query:
        return jsonify({"message": "No text provided."}), 400

    if not is_flight_query(query):
        return jsonify({"message": "No flight request detected.", "crew_result": ""})

    result = FlightsCrew().crew().kickoff(inputs={"query": query})
    return jsonify({"message": "Flight search complete.", "crew_result": str(result)})

if __name__ == "__main__":
    app.run(debug=True)
