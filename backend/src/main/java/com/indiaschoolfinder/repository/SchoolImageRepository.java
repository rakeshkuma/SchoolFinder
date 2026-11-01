package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.SchoolImage;
import com.indiaschoolfinder.enums.ImagePermission;
import com.indiaschoolfinder.enums.ImageType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface SchoolImageRepository extends JpaRepository<SchoolImage, Long> {

    /** Every image, including ones awaiting permission (admin use). */
    List<SchoolImage> findBySchoolIdOrderBySortOrderAscIdAsc(Long schoolId);

    List<SchoolImage> findBySchoolIdAndPermissionStatusInOrderBySortOrderAscIdAsc(Long schoolId,
                                                                                  Collection<ImagePermission> permissions);

    /** One query for all cards on a directory page (avoids N+1); real photos before illustrations. */
    @Query("select i from SchoolImage i where i.schoolId in :schoolIds and i.imageType <> :excluded"
            + " and i.permissionStatus in :permissions order by i.schoolId, i.illustrative, i.sortOrder, i.id")
    List<SchoolImage> findGalleryImagesForSchools(@Param("schoolIds") Collection<Long> schoolIds,
                                                  @Param("excluded") ImageType excluded,
                                                  @Param("permissions") Collection<ImagePermission> permissions);
}
