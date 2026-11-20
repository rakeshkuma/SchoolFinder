package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.NotificationSyncRun;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.Optional;

public interface NotificationSyncRunRepository extends JpaRepository<NotificationSyncRun, Long> {

    Page<NotificationSyncRun> findAllByOrderByStartedAtDescIdDesc(Pageable pageable);

    Optional<NotificationSyncRun> findFirstByOrderByStartedAtDescIdDesc();

    /** The newest run that reached every source, or at least some (PARTIAL). */
    Optional<NotificationSyncRun> findFirstByStatusInOrderByStartedAtDescIdDesc(Collection<NotificationSyncRun.Status> statuses);

    /** Runs left RUNNING by a server that stopped mid-run (called only while holding the run lock, so none is live). */
    @Modifying
    @Query("update NotificationSyncRun r set r.status = com.indiaschoolfinder.entity.NotificationSyncRun.Status.ABANDONED, "
            + "r.finishedAt = :now where r.status = com.indiaschoolfinder.entity.NotificationSyncRun.Status.RUNNING")
    int abandonRunning(@Param("now") Instant now);

    /** Deletes finished run records started before the cut-off (they are operational data only). */
    @Modifying
    @Query("delete from NotificationSyncRun r where r.startedAt < :before "
            + "and r.status <> com.indiaschoolfinder.entity.NotificationSyncRun.Status.RUNNING")
    int deleteFinishedBefore(@Param("before") Instant before);
}
