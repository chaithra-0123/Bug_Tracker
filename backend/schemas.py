
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


# USER SCHEMAS
class UserCreate(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str

    model_config = ConfigDict(from_attributes=True)


# PROJECT SCHEMAS
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ISSUE SCHEMAS
class IssueCreate(BaseModel):
    title: str
    description: Optional[str] = None
    issue_type: str = "bug"
    priority: str = "medium"
    project_id: int
    assignee_id: Optional[int] = None
    deadline: Optional[datetime] = None


class IssueStatusUpdate(BaseModel):
    status: str


class IssueResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    issue_type: str
    status: str
    priority: str
    project_id: int
    reporter_id: int
    assignee_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


# COMMENT SCHEMAS

class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[int] = None


class CommentResponse(BaseModel):
    id: int
    content: str
    issue_id: int
    author_id: int
    parent_id: Optional[int] = None
    created_at: datetime
    author: UserResponse

    model_config = ConfigDict(from_attributes=True)




class IssueUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    issue_type: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[int] = None
