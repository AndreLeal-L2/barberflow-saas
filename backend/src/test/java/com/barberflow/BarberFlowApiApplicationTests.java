package com.barberflow;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.session.SessionRepository;
import org.springframework.session.jdbc.JdbcIndexedSessionRepository;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class BarberFlowApiApplicationTests {

	@Autowired
	private SessionRepository<?> sessionRepository;

	@Test
	void contextLoads() {
		assertThat(sessionRepository).isInstanceOf(JdbcIndexedSessionRepository.class);
	}

}
