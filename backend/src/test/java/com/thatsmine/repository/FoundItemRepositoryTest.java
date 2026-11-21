package com.thatsmine.repository;

import com.thatsmine.entity.Category;
import com.thatsmine.entity.FoundItem;
import com.thatsmine.entity.User;
import com.thatsmine.enums.FoundItemStatus;
import com.thatsmine.enums.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@TestPropertySource(locations = "classpath:application-test.yml")
class FoundItemRepositoryTest {

    @Autowired
    private FoundItemRepository foundItemRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    private User testUser;
    private Category testCategory;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
            .email("test@test.com")
            .passwordHash("hash")
            .nickname("test")
            .role(UserRole.USER)
            .build();
        userRepository.save(testUser);

        testCategory = Category.builder()
            .categoryName("Test Category")
            .sortOrder(1)
            .build();
        categoryRepository.save(testCategory);
    }

    @Test
    void testSoftDeleteExclusion() {
        // 삭제되지 않은 항목 생성
        FoundItem item1 = FoundItem.builder()
            .reporter(testUser)
            .category(testCategory)
            .title("Item 1")
            .foundDate(LocalDate.now())
            .foundLocation("Location 1")
            .status(FoundItemStatus.REPORTED)
            .build();
        foundItemRepository.save(item1);

        // 삭제된 항목 생성
        FoundItem item2 = FoundItem.builder()
            .reporter(testUser)
            .category(testCategory)
            .title("Item 2")
            .foundDate(LocalDate.now())
            .foundLocation("Location 2")
            .status(FoundItemStatus.REPORTED)
            .deletedAt(LocalDateTime.now())
            .build();
        foundItemRepository.save(item2);

        // 삭제되지 않은 항목만 조회되는지 확인
        List<FoundItem> allItems = foundItemRepository.findAllNotDeleted();
        assertThat(allItems).hasSize(1);
        assertThat(allItems.get(0).getItemId()).isEqualTo(item1.getItemId());
    }

    @Test
    void testFindByIdNotDeleted() {
        // 삭제된 항목 생성
        FoundItem deletedItem = FoundItem.builder()
            .reporter(testUser)
            .category(testCategory)
            .title("Deleted Item")
            .foundDate(LocalDate.now())
            .foundLocation("Location")
            .status(FoundItemStatus.REPORTED)
            .deletedAt(LocalDateTime.now())
            .build();
        FoundItem saved = foundItemRepository.save(deletedItem);

        // 삭제된 항목은 조회되지 않아야 함
        Optional<FoundItem> result = foundItemRepository.findByIdNotDeleted(saved.getItemId());
        assertThat(result).isEmpty();
    }

    @Test
    void testFindByStatusNotDeleted() {
        // 각 상태별 항목 생성
        FoundItem storedItem = FoundItem.builder()
            .reporter(testUser)
            .category(testCategory)
            .title("Stored Item")
            .foundDate(LocalDate.now())
            .foundLocation("Location")
            .status(FoundItemStatus.STORED)
            .build();
        foundItemRepository.save(storedItem);

        // 같은 상태의 삭제된 항목
        FoundItem deletedItem = FoundItem.builder()
            .reporter(testUser)
            .category(testCategory)
            .title("Deleted Stored Item")
            .foundDate(LocalDate.now())
            .foundLocation("Location")
            .status(FoundItemStatus.STORED)
            .deletedAt(LocalDateTime.now())
            .build();
        foundItemRepository.save(deletedItem);

        // STORED 상태인 미삭제 항목만 조회
        List<FoundItem> storedItems = foundItemRepository.findByStatusNotDeleted(FoundItemStatus.STORED);
        assertThat(storedItems).hasSize(1);
        assertThat(storedItems.get(0).getItemId()).isEqualTo(storedItem.getItemId());
    }
}
