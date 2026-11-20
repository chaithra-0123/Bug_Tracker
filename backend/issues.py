
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from auth import get_db
from models import Issue, Project, User, Comment, Attachment
from schemas import (
    IssueCreate,
    IssueResponse,
    IssueStatusUpdate,
    IssueUpdate,
    CommentCreate,
    CommentResponse
)
from dependencies import get_current_user

router = APIRouter(prefix="/issues", tags=["Issues"])


# Check issue access according to user role
def check_issue_access(issue, current_user):
    if current_user not in issue.project.members:
        raise HTTPException(status_code=403, detail="Access denied")

    if current_user.role == "admin":
        return

    if current_user.role == "developer":
        if issue.assignee_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You can only access issues assigned to you"
            )
        return

    if current_user.role == "viewer":
        if issue.reporter_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You can only access issues reported by you"
            )
        return

    raise HTTPException(status_code=403, detail="Invalid role")


# Get issues visible to the logged-in user
def get_visible_issues_query(db, current_user):
    query = (
        db.query(Issue)
        .join(Project)
        .filter(Project.members.any(id=current_user.id))
    )

    if current_user.role == "viewer":
        query = query.filter(Issue.reporter_id == current_user.id)

    elif current_user.role == "developer":
        query = query.filter(Issue.assignee_id == current_user.id)

    elif current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Invalid role")

    return query


# VIEWER: Create an issue
@router.post("/", response_model=IssueResponse)
def create_issue(
    issue: IssueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "viewer":
        raise HTTPException(
            status_code=403,
            detail="Only Viewers can create new issues"
        )

    if issue.assignee_id is not None:
        raise HTTPException(
            status_code=403,
            detail="Only Admin can assign issues"
        )

    project = db.query(Project).filter(
        Project.id == issue.project_id
    ).first()

    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if current_user not in project.members:
        raise HTTPException(status_code=403, detail="Not a project member")

    new_issue = Issue(
        title=issue.title,
        description=issue.description,
        issue_type=issue.issue_type,
        priority=issue.priority,
        project_id=issue.project_id,
        reporter_id=current_user.id,
        assignee_id=None,
        deadline=issue.deadline
    )

    db.add(new_issue)
    db.commit()
    db.refresh(new_issue)

    return new_issue


# View issues according to role
@router.get("/", response_model=list[IssueResponse])
def get_issues(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_visible_issues_query(db, current_user).all()


# Update issue status: Developer assigned to issue or Admin
@router.patch("/{issue_id}/status", response_model=IssueResponse)
def update_issue_status(
    issue_id: int,
    status_data: IssueStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["developer", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Only Developers and Admins can update issue status"
        )

    issue = db.query(Issue).filter(Issue.id == issue_id).first()

    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")

    check_issue_access(issue, current_user)

    allowed_statuses = ["todo", "in_progress", "review", "done"]

    if status_data.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")

    issue.status = status_data.status

    db.commit()
    db.refresh(issue)

    return issue




# View comments and replies
# All roles can comment, but only Admin and Developer can reply
@router.post("/{issue_id}/comments", response_model=CommentResponse)
def add_comment(
    issue_id: int,
    comment: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()

    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")

    check_issue_access(issue, current_user)

    user_role = str(current_user.role).lower()

    # Viewers cannot reply to existing comments
    if comment.parent_id is not None and user_role == "viewer":
        raise HTTPException(
            status_code=403,
            detail="Viewers cannot reply to comments"
        )

    if comment.parent_id is not None:
        parent_comment = db.query(Comment).filter(
            Comment.id == comment.parent_id,
            Comment.issue_id == issue_id
        ).first()

        if parent_comment is None:
            raise HTTPException(
                status_code=404,
                detail="Parent comment not found in this issue"
            )

    new_comment = Comment(
        content=comment.content,
        issue_id=issue_id,
        author_id=current_user.id,
        parent_id=comment.parent_id
    )

    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    return new_comment

# Search and filter issues according to role
@router.get("/search", response_model=list[IssueResponse])
def search_issues(
    keyword: str = None,
    status: str = None,
    priority: str = None,
    issue_type: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = get_visible_issues_query(db, current_user)

    if keyword:
        query = query.filter(
            Issue.title.ilike(f"%{keyword}%") |
            Issue.description.ilike(f"%{keyword}%")
        )

    if status:
        query = query.filter(Issue.status == status)

    if priority:
        query = query.filter(Issue.priority == priority)

    if issue_type:
        query = query.filter(Issue.issue_type == issue_type)

    return query.all()


# Only Admin can edit issues
@router.put("/{issue_id}", response_model=IssueResponse)
def edit_issue(
    issue_id: int,
    data: IssueUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only Admin can edit issues"
        )

    issue = db.query(Issue).filter(Issue.id == issue_id).first()

    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")

    check_issue_access(issue, current_user)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(issue, key, value)

    db.commit()
    db.refresh(issue)

    return issue


# Only Admin can delete issues
@router.delete("/{issue_id}")
def delete_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only Admin can delete issues"
        )

    issue = db.query(Issue).filter(Issue.id == issue_id).first()

    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")

    check_issue_access(issue, current_user)

    db.delete(issue)
    db.commit()

    return {"message": "Issue deleted successfully"}


# Only Viewer can upload screenshots to their own reported issues
@router.post("/{issue_id}/attachments")
async def upload_screenshot(
    issue_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "viewer":
        raise HTTPException(
            status_code=403,
            detail="Only Viewers can upload screenshots"
        )

    issue = db.query(Issue).filter(Issue.id == issue_id).first()

    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")

    check_issue_access(issue, current_user)

    allowed_types = ["image/jpeg", "image/png", "image/webp"]

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG and WEBP images are allowed"
        )

    content = await file.read(5 * 1024 * 1024 + 1)

    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Image size must be below 5 MB"
        )

    upload_folder = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "uploads")
    )

    os.makedirs(upload_folder, exist_ok=True)

    extension = os.path.splitext(file.filename or "")[1].lower()
    filename = f"{uuid.uuid4().hex}{extension}"
    file_path = os.path.join(upload_folder, filename)

    with open(file_path, "wb") as image:
        image.write(content)

    attachment = Attachment(
        filename=filename,
        file_path=file_path,
        issue_id=issue_id
    )

    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return {
        "message": "Screenshot uploaded successfully",
        "attachment_id": attachment.id,
        "filename": attachment.filename
    }



# Get screenshots for an issue
@router.get("/{issue_id}/attachments")
def get_issue_attachments(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()

    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")

    check_issue_access(issue, current_user)

    attachments = db.query(Attachment).filter(
        Attachment.issue_id == issue_id
    ).all()

    return [
        {"id": item.id, "filename": item.filename}
        for item in attachments
    ]

@router.get("/{issue_id}/attachments/{attachment_id}")
def view_issue_attachment(
    issue_id: int,
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()

    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")

    check_issue_access(issue, current_user)

    attachment = db.query(Attachment).filter(
        Attachment.id == attachment_id,
        Attachment.issue_id == issue_id
    ).first()

    if attachment is None:
        raise HTTPException(status_code=404, detail="Screenshot not found")

    if not os.path.exists(attachment.file_path):
        raise HTTPException(
            status_code=404,
            detail="Screenshot file is missing from storage"
        )

    return FileResponse(
        attachment.file_path,
        media_type="image/" + attachment.filename.rsplit(".", 1)[-1].lower()
    )