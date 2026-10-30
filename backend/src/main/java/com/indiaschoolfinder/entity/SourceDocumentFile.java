package com.indiaschoolfinder.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** The uploaded file of a {@link SourceDocument}, stored separately so that lists and reviews never load it. */
@Getter
@Setter
@Entity
@Table(name = "source_document_file")
public class SourceDocumentFile {

    @Id
    private Long documentId;

    @Column(nullable = false, columnDefinition = "bytea")
    private byte[] data;
}
