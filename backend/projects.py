
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_db
from models import Project, User
from schemas import ProjectCreate, ProjectResponse
from dependencies import get_current_user

router = APIRouter(prefix="/projects", tags=["Projects"])


# Create a project
@router.post("/", response_model=ProjectResponse)
def create_project(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot create projects")

    new_project = Project(
        name=project.name,
        description=project.description
    )

    new_project.members.append(current_user)

    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    return new_project


# View all projects of logged-in user
@router.get("/", response_model=list[ProjectResponse])
def get_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return current_user.projects


# Get all registered users (Admin only)
@router.get("/users/")
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view all users")

    users = db.query(User).all()

    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
        for user in users
    ]


# Get members of a particular project
@router.get("/{project_id}/members")
def get_project_members(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()

    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if current_user.role != "admin" and current_user not in project.members:
        raise HTTPException(status_code=403, detail="You cannot view this project's members")

    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
        for user in project.members
    ]


# Add a team member (Admin only)
@router.post("/{project_id}/members/{user_id}")
def add_team_member(
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can add team members")

    project = db.query(Project).filter(Project.id == project_id).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if user in project.members:
        raise HTTPException(status_code=400, detail="User already a member")

    project.members.append(user)
    db.commit()

    return {"message": "Team member added successfully"}


# Update a project
@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()

    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if current_user.role != "admin" and current_user not in project.members:
        raise HTTPException(status_code=403, detail="You cannot update this project")

    if current_user.role == "viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot update projects")

    project.name = project_data.name
    project.description = project_data.description

    db.commit()
    db.refresh(project)

    return project


# Delete a project (Admin only)
@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete projects")

    project = db.query(Project).filter(Project.id == project_id).first()

    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    db.delete(project)
    db.commit()

    return {"message": "Project deleted successfully"}
