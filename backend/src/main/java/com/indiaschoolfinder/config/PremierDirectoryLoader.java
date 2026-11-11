package com.indiaschoolfinder.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indiaschoolfinder.dto.ranking.PremierDirectoryDtos;
import com.indiaschoolfinder.service.PremierDirectoryService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;

/**
 * Loads seed/premier-directory.json when the stored entries are from another version of the file or their number
 * differs. Profile links are worked out again at every start, so schools imported later are picked up.
 */
@Slf4j
@Component
public class PremierDirectoryLoader implements ApplicationRunner {

    private final PremierDirectoryService directory;
    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public PremierDirectoryLoader(PremierDirectoryService directory, JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.directory = directory;
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @Override
    public void run(ApplicationArguments args) throws IOException {
        PremierDirectoryDtos.Seed seed;
        try (InputStream in = new ClassPathResource("seed/premier-directory.json").getInputStream()) {
            seed = objectMapper.readValue(in, PremierDirectoryDtos.Seed.class);
        }
        Long current = jdbc.queryForObject("SELECT count(*) FROM premier_school WHERE seed_version = ?", Long.class, seed.version());
        Long all = jdbc.queryForObject("SELECT count(*) FROM premier_school", Long.class);
        if (current == null || current != seed.entries().size() || !current.equals(all)) directory.load(seed);
        log.info("Premier school directory ready: {} of {} schools linked to a profile", directory.link(), seed.entries().size());
    }
}
