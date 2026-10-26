package db.migration;

import com.indiaschoolfinder.entity.School;
import com.indiaschoolfinder.util.SchoolNames;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * Tidies display names of schools imported from CBSE SARAS (punctuation, district markers and repeated words left by
 * appending a place from the postal address), with the same rules the CSV import now applies (SchoolNames). The exact
 * CBSE name stays in each description. Only rows with a CBSE affiliation are touched: they are outside the name + PIN
 * unique index, so a tidied name cannot collide. search_keywords is derived from the name and is updated with it.
 */
public class V14__tidy_imported_school_names extends BaseJavaMigration {

    @Override
    public void migrate(Context context) throws Exception {
        try (Statement select = context.getConnection().createStatement();
             ResultSet rows = select.executeQuery("""
                     SELECT id, name, education_board_code FROM school
                     WHERE source_url LIKE 'https://saras.cbse.gov.in/%'
                       AND education_board_code IS NOT NULL AND affiliation_number IS NOT NULL""");
             PreparedStatement update = context.getConnection().prepareStatement(
                     "UPDATE school SET name = ?, search_keywords = ? WHERE id = ?")) {
            while (rows.next()) {
                String name = rows.getString("name");
                String tidy = SchoolNames.tidy(name);
                if (!tidy.equals(name)) {
                    update.setString(1, tidy);
                    update.setString(2, School.keywordsFor(tidy, rows.getString("education_board_code")));
                    update.setLong(3, rows.getLong("id"));
                    update.addBatch();
                }
            }
            update.executeBatch();
        }
    }
}
