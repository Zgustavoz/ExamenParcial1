package com.diagramas.platform.codegen.repository;

import com.diagramas.platform.codegen.domain.Task;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepository extends JpaRepository<Task, UUID> {

    Optional<Task> findByIdAndCompanyId(UUID id, UUID companyId);

    List<Task> findByCompanyIdOrderByCreatedAtDesc(UUID companyId);

    List<Task> findByCompanyIdAndDiagramIdOrderByCreatedAtDesc(UUID companyId, UUID diagramId);
}
