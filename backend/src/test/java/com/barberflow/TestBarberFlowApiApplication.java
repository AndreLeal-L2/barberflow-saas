package com.barberflow;

import org.springframework.boot.SpringApplication;

public class TestBarberFlowApiApplication {

	public static void main(String[] args) {
		SpringApplication.from(BarberFlowApiApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
