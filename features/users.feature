@api @users
Feature: Users API
  Verify the user endpoints of the target API: single user lookup,
  listing with pagination, and negative behaviour for unknown users.

  Background:
    Given the API is targeting the "qa" environment

  @smoke
  Scenario: Get a single user
    When I send a "GET" request to "/api/users/2"
    Then the response status code should be 200
    And the response field "data.id" should be "2"
    And the response field "data.email" should not be empty
    And the response should match the "user-detail" schema

  @smoke
  Scenario: List users on page 2
    When I send a "GET" request to "/api/users?page=2"
    Then the response status code should be 200
    And the response field "page" should be "2"
    And the response field "data.length" should be "6"
    And the response field "data[0].id" should not be empty

  @regression @ddf
  Scenario Outline: Get user by id <user_id>
    When I send a "GET" request to "/api/users/<user_id>"
    Then the response status code should be <status_code>

    Examples:
      | user_id | status_code |
      | 1       | 200         |
      | 2       | 200         |
      | 3       | 200         |
      | 12      | 200         |

  @negative @regression
  Scenario: User not found
    When I send a "GET" request to "/api/users/9999"
    Then the response status code should be 404
