package com.indiaschoolfinder.entity;

import com.indiaschoolfinder.enums.ExamNoticeKind;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/** An official notice (notification, date change, result …) published by the conducting body, linked at its source. */
@Getter
@Setter
@Entity
@Table(name = "exam_notice")
public class ExamNotice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long examId;

    @Column(length = 40)
    private String cycle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ExamNoticeKind kind;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(nullable = false)
    private LocalDate publishedOn;

    @Column(nullable = false, length = 500)
    private String url;
}
