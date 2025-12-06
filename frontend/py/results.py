import csv
import io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from .database import get_db
from .models import SpeedtestResult
from .schemas import DeleteModel
from .dependencies import verify_session

router = APIRouter(dependencies=[Depends(verify_session)])

@router.get("/api/results")
async def get_results(db: Session = Depends(get_db)):
    return db.query(SpeedtestResult).order_by(SpeedtestResult.timestamp.desc()).limit(1000).all()

@router.get("/api/results/latest")
async def get_latest(db: Session = Depends(get_db)):
    res = db.query(SpeedtestResult).order_by(SpeedtestResult.timestamp.desc()).first()
    return res if res else JSONResponse(content={}, status_code=404)

@router.delete("/api/results")
async def del_res(d: DeleteModel, db: Session = Depends(get_db)):
    c = db.query(SpeedtestResult).filter(SpeedtestResult.id.in_(d.ids)).delete(synchronize_session=False)
    db.commit()
    return {"deleted_count": c}

@router.get("/api/export")
async def export_csv(db: Session = Depends(get_db)):
    results = db.query(SpeedtestResult).order_by(SpeedtestResult.timestamp.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Timestamp', 'Ping', 'Download', 'Upload'])
    for r in results: writer.writerow([r.timestamp, r.ping, r.download, r.upload])
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=speedtest.csv"})