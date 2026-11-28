package com.indiaschoolfinder.entity;

import com.indiaschoolfinder.dto.admin.CsvImportResult;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** One run of the ranking import: what it did, its row errors, and who approved its entries for publication. */
@Getter
@Setter
@Entity
@Table(name = "ranking_import_job")
public class RankingImportJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fileName;

    @Column(nullable = false, length = 20)
    private String mode;

    private int totalRows;
    private int validRows;
    private int created;
    private int updated;
    private boolean committed;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private List<CsvImportResult.RowError> errors = new ArrayList<>();

    private String importedBy;

    @Column(nullable = false)
    private Instant importedAt;

    private String approvedBy;
    private Instant approvedAt;
}
