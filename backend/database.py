import time
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.exc import OperationalError

from config import DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME, get_log

# Konstrukcja URL bazy danych
SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

Base = declarative_base()

# Globalne zmienne silnika i sesji
engine = None
SessionLocal = None

def get_db():
    """Dependency dla FastAPI"""
    if SessionLocal is None:
        raise Exception("Database not initialized")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def initialize_db(app_state, max_retries=10, delay=5):
    """Inicjalizacja połączenia i proste migracje"""
    logging.info(get_log("db_init"))
    
    global engine, SessionLocal
    engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Zapisujemy w app_state, żeby można było użyć w wątkach pobocznych (watchdog/scheduler)
    app_state["engine"] = engine
    app_state["SessionLocal"] = SessionLocal

    # Import lokalny modeli, aby Base wiedziało co tworzyć
    # (Unikamy cyklicznego importu na poziomie modułu)
    import models 

    for i in range(max_retries):
        try:
            with engine.connect() as connection:
                # Tworzenie tabel
                Base.metadata.create_all(bind=engine)
                
                # --- Migracje SQL ---
                
                # 1. Migracja Startup Test
                try:
                    connection.execute(text("SELECT startup_test_enabled FROM app_settings LIMIT 1"))
                except Exception:
                    logging.info(get_log("db_mig_startup"))
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN startup_test_enabled BOOLEAN DEFAULT 1"))
                    connection.commit()
                
                # 2. Migracja Kolory Wykresów (Podstawowe)
                try:
                    connection.execute(text("SELECT chart_color_download FROM app_settings LIMIT 1"))
                except Exception:
                    logging.info(get_log("db_mig_colors"))
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN chart_color_download VARCHAR(20) DEFAULT NULL"))
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN chart_color_upload VARCHAR(20) DEFAULT NULL"))
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN chart_color_ping VARCHAR(20) DEFAULT NULL"))
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN chart_color_jitter VARCHAR(20) DEFAULT NULL"))
                    connection.commit()

                # 3. Migracja Języka
                try:
                    connection.execute(text("SELECT app_language FROM app_settings LIMIT 1"))
                except Exception:
                    logging.info(get_log("db_mig_lang"))
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN app_language VARCHAR(5) DEFAULT 'pl'"))
                    connection.commit()

                # 4. Inicjalizacja tabeli powiadomień (rekord ID=1)
                try:
                    with SessionLocal() as session:
                        ns = session.query(models.NotificationSettings).filter(models.NotificationSettings.id == 1).first()
                        if not ns:
                            session.add(models.NotificationSettings(id=1, enabled=False, provider="browser"))
                            session.commit()
                            logging.info(get_log("db_mig_notify"))
                except Exception as e:
                    logging.warning(f"Notification init warning: {e}")

                # 5. Migracja Kolory Wykresów (Latency)
                try:
                    connection.execute(text("SELECT chart_color_lat_dl_low FROM app_settings LIMIT 1"))
                except Exception:
                    logging.info("🔧 Migration: Adding latency chart color columns...")
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN chart_color_lat_dl_low VARCHAR(20) DEFAULT NULL"))
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN chart_color_lat_dl_high VARCHAR(20) DEFAULT NULL"))
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN chart_color_lat_ul_low VARCHAR(20) DEFAULT NULL"))
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN chart_color_lat_ul_high VARCHAR(20) DEFAULT NULL"))
                    connection.commit()

                # 6. Migracja Kolor Ping Watchdog
                try:
                    connection.execute(text("SELECT chart_color_ping_watchdog FROM app_settings LIMIT 1"))
                except Exception:
                    logging.info("🔧 Migration: Adding chart_color_ping_watchdog column...")
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN chart_color_ping_watchdog VARCHAR(20) DEFAULT NULL"))
                    connection.commit()

                logging.info(get_log("db_connected"))
                return
        except OperationalError:
            logging.warning(get_log("db_unavailable", i+1, max_retries))
            if i < max_retries - 1:
                time.sleep(delay)
            else:
                raise