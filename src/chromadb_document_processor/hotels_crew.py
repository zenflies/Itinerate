from crewai import LLM, Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from pydantic import BaseModel, ConfigDict

from chromadb_document_processor.tools.hotel_search_tool import HotelSearchTool


class HotelInfo(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = ""
    name: str = ""
    stars: int = 3
    rating: float = 0.0
    reviews: int = 0
    type: str = ""
    neighborhood: str = ""
    price: int = 0
    description: str = ""
    amenities: list[str] = []
    link: str = ""
    image: str = ""


class HotelResults(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hotels: list[HotelInfo]


@CrewBase
class HotelsCrew:
    """Crew for handling hotel search requests."""

    @agent
    def hotel_search_specialist(self) -> Agent:
        return Agent(
            config=self.agents_config["hotel_search_specialist"],
            tools=[HotelSearchTool()],
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=10,
            verbose=True,
            llm=LLM(model="openai/gpt-5.4-mini"),
        )

    @task
    def search_hotels(self) -> Task:
        return Task(
            config=self.tasks_config["search_hotels"],
        )

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )
