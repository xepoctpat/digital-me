"""
Migration: Add provenance fields to l1_shades table
Version: 20260405093000
"""

description = "Add provenance fields to l1_shades table"


def upgrade(conn):
    """Add timelines and cluster_info columns to l1_shades if missing."""
    cursor = conn.cursor()

    cursor.execute("PRAGMA table_info(l1_shades)")
    columns = [row[1] for row in cursor.fetchall()]

    if "timelines" not in columns:
        cursor.execute("ALTER TABLE l1_shades ADD COLUMN timelines TEXT")

    if "cluster_info" not in columns:
        cursor.execute("ALTER TABLE l1_shades ADD COLUMN cluster_info TEXT")


def downgrade(conn):
    """Remove timelines and cluster_info columns from l1_shades via table rebuild."""
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE l1_shades_temp (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version INTEGER NOT NULL,
            name VARCHAR(200),
            aspect VARCHAR(200),
            icon VARCHAR(100),
            desc_third_view TEXT,
            content_third_view TEXT,
            desc_second_view TEXT,
            content_second_view TEXT,
            create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (version) REFERENCES l1_versions(version)
        )
        """
    )

    cursor.execute(
        """
        INSERT INTO l1_shades_temp (
            id,
            version,
            name,
            aspect,
            icon,
            desc_third_view,
            content_third_view,
            desc_second_view,
            content_second_view,
            create_time
        )
        SELECT
            id,
            version,
            name,
            aspect,
            icon,
            desc_third_view,
            content_third_view,
            desc_second_view,
            content_second_view,
            create_time
        FROM l1_shades
        """
    )

    cursor.execute("DROP TABLE l1_shades")
    cursor.execute("ALTER TABLE l1_shades_temp RENAME TO l1_shades")