
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey,
    Table, Enum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


# Project team members (many-to-many relationship)
project_members = Table(
    "project_members",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("project_id", Integer, ForeignKey("projects.id"), primary_key=True)
)


# 1. USER TABLE
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)

    role = Column(
        Enum("admin", "developer", "viewer", name="user_roles"),
        default="developer",
        nullable=False
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    projects = relationship(
        "Project",
        secondary=project_members,
        back_populates="members"
    )

    assigned_issues = relationship(
        "Issue",
        foreign_keys="Issue.assignee_id",
        back_populates="assignee"
    )

    comments = relationship("Comment", back_populates="author")


# 2. PROJECT TABLE
class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    members = relationship(
        "User",
        secondary=project_members,
        back_populates="projects"
    )

    issues = relationship(
        "Issue",
        back_populates="project",
        cascade="all, delete-orphan"
    )


# 3. ISSUE TABLE
class Issue(Base):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)

    issue_type = Column(
        Enum("bug", "task", "feature", name="issue_types"),
        default="bug",
        nullable=False
    )

    status = Column(
        Enum("todo", "in_progress", "review", "done", name="issue_statuses"),
        default="todo",
        nullable=False
    )

    priority = Column(
        Enum("low", "medium", "high", "critical", name="issue_priorities"),
        default="medium",
        nullable=False
    )

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    deadline = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="issues")

    assignee = relationship(
        "User",
        foreign_keys=[assignee_id],
        back_populates="assigned_issues"
    )

    comments = relationship(
        "Comment",
        back_populates="issue",
        cascade="all, delete-orphan"
    )

    attachments = relationship(
        "Attachment",
        back_populates="issue",
        cascade="all, delete-orphan"
    )


# 4. COMMENT TABLE
class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)

    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Connect a reply to its parent comment
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    issue = relationship("Issue", back_populates="comments")
    author = relationship("User", back_populates="comments")

    parent = relationship(
        "Comment",
        remote_side=[id],
        back_populates="replies"
    )

    replies = relationship(
        "Comment",
        back_populates="parent"
    )


# 5. ATTACHMENT TABLE
class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)

    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)

    issue = relationship("Issue", back_populates="attachments")
