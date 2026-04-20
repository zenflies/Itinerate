import os
from typing import Any

from crewai import LLM, Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from pydantic import BaseModel, ConfigDict

from chromadb_document_processor.tools.flight_search_tool import FlightSearchTool


class FlightInfo(BaseModel):
    model_config = ConfigDict(extra="forbid")

    airline: str = ""
    flight_number: str = ""
    origin: str = ""
    destination: str = ""
    departure_time: str = ""
    arrival_time: str = ""
    price: str = ""
    duration: str = ""
    stops: str = ""


class FlightResults(BaseModel):
    model_config = ConfigDict(extra="forbid")

    flights: list[FlightInfo]
    return_flights: list[FlightInfo] = []


@CrewBase
class FlightsCrew:
    """Crew for handling flight search requests."""

    @agent
    def flight_search_specialist(self) -> Agent:
        return Agent(
            config=self.agents_config["flight_search_specialist"],
            tools=[FlightSearchTool()],
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=10,
            verbose=True,
            llm=LLM(model="openai/gpt-5.4-mini"),
        )

    @task
    def search_flights(self) -> Task:
        return Task(
            config=self.tasks_config["search_flights"],
        )

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )
