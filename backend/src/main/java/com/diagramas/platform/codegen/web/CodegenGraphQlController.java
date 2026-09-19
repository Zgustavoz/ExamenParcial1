package com.diagramas.platform.codegen.web;

import com.diagramas.platform.codegen.domain.Task;
import com.diagramas.platform.codegen.service.CodeGenerationService;
import com.diagramas.platform.common.security.CurrentUser;
import com.diagramas.platform.common.util.Json;
import java.util.List;
import java.util.UUID;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;

/** Frontera GraphQL de generación de código: CU-14 (DESIGNER, DEVELOPER). */
@Controller
@PreAuthorize("hasAnyRole('DESIGNER', 'DEVELOPER')")
public class CodegenGraphQlController {

    public record TaskDto(
            UUID id, UUID diagramId, String type, String title, String description, String status, Object resultJson,
            UUID assignedTo, UUID createdBy, String createdAt, String startedAt, String completedAt) {

        static TaskDto of(Task t) {
            return new TaskDto(t.getId(), t.getDiagramId(), t.getType(), t.getTitle(), t.getDescription(), t.getStatus(),
                    Json.plain(t.getResultJson()), t.getAssignedTo(), t.getCreatedBy(), String.valueOf(t.getCreatedAt()),
                    t.getStartedAt() == null ? null : t.getStartedAt().toString(),
                    t.getCompletedAt() == null ? null : t.getCompletedAt().toString());
        }
    }

    private final CodeGenerationService codegen;

    public CodegenGraphQlController(CodeGenerationService codegen) {
        this.codegen = codegen;
    }

    @MutationMapping
    public TaskDto generateBackendCode(@Argument UUID diagramId, @Argument String language) {
        return TaskDto.of(codegen.generate(CurrentUser.get(), diagramId, language));
    }

    @QueryMapping
    public List<TaskDto> tasks(@Argument UUID diagramId) {
        return codegen.list(CurrentUser.get(), diagramId).stream().map(TaskDto::of).toList();
    }

    @QueryMapping
    public TaskDto task(@Argument UUID id) {
        return TaskDto.of(codegen.get(CurrentUser.get(), id));
    }
}
