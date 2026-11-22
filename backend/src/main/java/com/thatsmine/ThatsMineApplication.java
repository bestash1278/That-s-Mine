package com.thatsmine;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;

@SpringBootApplication
public class ThatsMineApplication {

	public static void main(String[] args) {
		// "미래 날짜 금지" 검증과 기본 날짜가 한국 시간 기준이 되도록 고정한다.
		TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"));
		SpringApplication.run(ThatsMineApplication.class, args);
	}

}
