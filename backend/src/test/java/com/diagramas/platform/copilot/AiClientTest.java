package com.diagramas.platform.copilot;

import static org.assertj.core.api.Assertions.assertThat;

import com.diagramas.platform.common.config.AppProperties;
import com.diagramas.platform.common.error.ApiException;
import com.diagramas.platform.common.error.ErrorCode;
import com.diagramas.platform.copilot.service.AiClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

/** CP-04 (ai-service apagado): conexión rechazada → AI_UNAVAILABLE, sin excepciones internas. */
class AiClientTest {

    @Test
    void servicioApagadoEsAiUnavailable() {
        AppProperties props = new AppProperties(null, "", List.of(), null, new AppProperties.Ai("http://127.0.0.1:1", "k", 2),
                null, null, null, null, null);
        AiClient client = new AiClient(props);
        ObjectMapper m = new ObjectMapper();
        try {
            client.interpret("hola", "TEXTO", m.createObjectNode(), m.createArrayNode());
            throw new AssertionError("debió fallar");
        } catch (ApiException e) {
            assertThat(e.code()).isEqualTo(ErrorCode.AI_UNAVAILABLE);
            assertThat(e.getMessage()).contains("no está disponible");
        }
    }
}
