import time
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.exc import OperationalError

from config import DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME, get_log

SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

Base = declarative_base()

engine = None
SessionLocal = None

def get_db():
    if SessionLocal is None:
        raise Exception("Database not initialized")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def initialize_db(app_state, max_retries=10, delay=5):
    logging.info(get_log("db_init"))
    
    global engine, SessionLocal
    engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    app_state["engine"] = engine
    app_state["SessionLocal"] = SessionLocal

    import models 

    for i in range(max_retries):
        try:
            with engine.connect() as connection:
                Base.metadata.create_all(bind=engine)
                
                # --- Migracje SQL ---
                
                # Istniejące migracje...
                try:
                    connection.execute(text("SELECT startup_test_enabled FROM app_settings LIMIT 1"))
                except Exception:
                    logging.info(get_log("db_mig_startup"))
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN startup_test_enabled BOOLEAN DEFAULT 1"))
                    connection.commit()
                
                try:
                    connection.execute(text("SELECT chart_color_download FROM app_settings LIMIT 1"))
                except Exception:
                    logging.info(get_log("db_mig_colors"))
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN chart_color_download VARCHAR(20) DEFAULT NULL"))
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN chart_color_upload VARCHAR(20) DEFAULT NULL"))
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN chart_color_ping VARCHAR(20) DEFAULT NULL"))
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN chart_color_jitter VARCHAR(20) DEFAULT NULL"))
                    connection.commit()

                try:
                    connection.execute(text("SELECT app_language FROM app_settings LIMIT 1"))
                except Exception:
                    logging.info(get_log("db_mig_lang"))
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN app_language VARCHAR(5) DEFAULT 'pl'"))
                    connection.commit()

                try:
                    connection.execute(text("SELECT chart_color_lat_dl_low FROM app_settings LIMIT 1"))
                except Exception:
                    logging.info("🔧 Migration: Adding latency chart color columns...")
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN chart_color_lat_dl_low VARCHAR(20) DEFAULT NULL"))
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN chart_color_lat_dl_high VARCHAR(20) DEFAULT NULL"))
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN chart_color_lat_ul_low VARCHAR(20) DEFAULT NULL"))
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN chart_color_lat_ul_high VARCHAR(20) DEFAULT NULL"))
                    connection.commit()

                try:
                    connection.execute(text("SELECT chart_color_ping_watchdog FROM app_settings LIMIT 1"))
                except Exception:
                    logging.info("🔧 Migration: Adding chart_color_ping_watchdog column...")
                    connection.execute(text("ALTER TABLE app_settings ADD COLUMN chart_color_ping_watchdog VARCHAR(20) DEFAULT NULL"))
                    connection.commit()

                # NOWE: Migracja OIDC display_name (Fix dla błędu OperationalError)
                try:
                    connection.execute(text("SELECT display_name FROM oidc_settings LIMIT 1"))
                except Exception:
                    logging.info("🔧 Migration: Adding display_name to oidc_settings...")
                    try:
                        connection.execute(text("ALTER TABLE oidc_settings ADD COLUMN display_name VARCHAR(50) DEFAULT 'SSO Login'"))
                        connection.commit()
                    except Exception as e:
                        logging.warning(f"OIDC migration warning (display_name): {e}")

                # NOWE: Migracja OIDC discovery_url (Fix dla błędu OperationalError z logów)
                try:
                    connection.execute(text("SELECT discovery_url FROM oidc_settings LIMIT 1"))
                except Exception:
                    logging.info("🔧 Migration: Adding discovery_url to oidc_settings...")
                    try:
                        # Zwiększamy limit znaków do 500, bo URL-e discovery potrafią być długie
                        connection.execute(text("ALTER TABLE oidc_settings ADD COLUMN discovery_url VARCHAR(500) DEFAULT NULL"))
                        connection.commit()
                    except Exception as e:
                        logging.warning(f"OIDC migration warning (discovery_url): {e}")

                try:
                    with SessionLocal() as session:
                        ns = session.query(models.NotificationSettings).filter(models.NotificationSettings.id == 1).first()
                        if not ns:
                            session.add(models.NotificationSettings(id=1, enabled=False, provider="browser"))
                            session.commit()
                            logging.info(get_log("db_mig_notify"))
                        
                        # Inicjalizacja OIDC Settings (ID=1)
                        # Teraz bezpieczne, bo migracje powyżej naprawiły brakujące kolumny
                        try:
                            oidc = session.query(models.OIDCSettings).filter(models.OIDCSettings.id == 1).first()
                            if not oidc:
                                session.add(models.OIDCSettings(id=1, enabled=False, display_name="Zaloguj przez SSO"))
                                session.commit()
                                logging.info("🔧 Migration: Initializing OIDC settings record...")
                        except Exception as e:
                             logging.warning(f"OIDC record init warning: {e}")

                except Exception as e:
                    logging.warning(f"Settings init warning: {e}")

                logging.info(get_log("db_connected"))
                return
        except OperationalError:
            logging.warning(get_log("db_unavailable", i+1, max_retries))
            if i < max_retries - 1:
                time.sleep(delay)
            else:
                raise