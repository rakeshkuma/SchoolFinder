package com.indiaschoolfinder.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indiaschoolfinder.dto.common.SchoolListDtos;
import com.indiaschoolfinder.service.SchoolListService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;

/**
 * Loads seed/school-lists.json when a list is missing or the file's version changes. School links are worked out again
 * at every start, so schools imported after the lists were loaded are picked up.
 */
@Slf4j
@Component
public class SchoolListLoader implements ApplicationRunner {

    private final SchoolListService lists;
    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public SchoolListLoader(SchoolListService lists, JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.lists = lists;
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @Override
    public void run(ApplicationArguments args) throws IOException {
        SchoolListDtos.Seed seed;
        try (InputStream in = new ClassPathResource("seed/school-lists.json").getInputStream()) {
            seed = objectMapper.readValue(in, SchoolListDtos.Seed.class);
        }
        for (SchoolListDtos.SeedList list : seed.lists()) {
            Integer current = jdbc.query("""
                    SELECT l.seed_version FROM school_list l WHERE l.list_key = ?
                    AND (SELECT count(*) FROM school_list_item i WHERE i.list_id = l.id) = ?""",
                    rs -> rs.next() ? rs.getInt(1) : null, list.key(), list.items().size());
            if (current == null || current != seed.version()) lists.replace(list, seed.version());
        }
        log.info("School lists ready: {} items linked to a school profile", lists.match());
    }
}
